import { useState, type ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { WeekPage } from "../features/week/WeekPage";
import { mockApi, type MockRoute } from "./mockApi";

const WEEK = "2026-11-02";
const PREVIEW = /\/api\/plans\/generate\/preview$/;
const ACCEPT = /\/api\/plans\/accept$/;

const inputVersions = {
  recipesVersionAt: "2026-11-01T10:00:00.000Z",
  targetsVersionAt: "2026-10-30T08:00:00.000Z",
  exclusionsVersionAt: null,
};

const previewSlots = [
  {
    day: 0,
    mealSlot: "dinner",
    recipeId: 7,
    locked: false,
    memberServings: [{ memberId: 1, servings: 1 }],
    reasons: [],
  },
  { day: 1, mealSlot: "dinner", recipeId: null, locked: false, memberServings: [], reasons: [] },
];

const preview = {
  weekStartDate: WEEK,
  seed: 42,
  plannerVersion: 2,
  baseRevision: null,
  inputVersions,
  slots: previewSlots,
  violations: [],
  search: { stopReason: "converged", evaluations: 12 },
};

const acceptedWeek = {
  id: 1,
  weekStartDate: WEEK,
  revision: 1,
  seed: 42,
  slots: previewSlots.map((slot) => ({ ...slot, recipeSnapshot: null })),
  violations: [],
  evaluation: { status: "current", staleInputs: [] },
};

const baseRoutes: MockRoute[] = [
  {
    method: "GET",
    path: /\/api\/household\/settings$/,
    body: { startDayOfWeek: 1, timezone: "Europe/Prague" },
  },
  { method: "GET", path: /\/api\/household\/members$/, body: [{ id: 1, name: "Svetlana" }] },
  {
    method: "GET",
    path: /\/api\/recipes$/,
    body: [{ id: 7, title: "Lentil soup", time: 45, cost: 120, servings: 4, kcalPerServing: 400 }],
  },
  {
    method: "GET",
    path: new RegExp(`/api/plans/${WEEK}$`),
    status: 404,
    body: { error: { message: "Not found" } },
  },
  { method: "POST", path: PREVIEW, body: preview },
];

let api: ReturnType<typeof mockApi>;

function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
      }),
  );
  return (
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[`/plan?start=${WEEK}`]}>{children}</MemoryRouter>
    </QueryClientProvider>
  );
}

const meta: Meta<typeof WeekPage> = {
  title: "features/week/WeekPage",
  component: WeekPage,
  decorators: [
    (Story) => (
      <Providers>
        <Story />
      </Providers>
    ),
  ],
  beforeEach: ({ parameters }) => {
    api = mockApi([...(parameters.acceptRoute ? [parameters.acceptRoute] : []), ...baseRoutes]);
    return () => api.restore();
  },
};

export default meta;
type Story = StoryObj<typeof WeekPage>;

async function openPreview(canvasElement: HTMLElement) {
  const canvas = within(canvasElement);
  await userEvent.click(await canvas.findByRole("button", { name: "Generate week" }));
  await canvas.findByText(/nothing is saved until you accept/i);
  return canvas;
}

export const PreviewThenAccept: Story = {
  parameters: { acceptRoute: { method: "POST", path: ACCEPT, body: acceptedWeek } },
  play: async ({ canvasElement }) => {
    const canvas = await openPreview(canvasElement);
    await expect(canvas.getByText("Lentil soup")).toBeInTheDocument();
    await expect(canvas.queryByText(/no plan generated/i)).not.toBeInTheDocument();
    await expect(api.requestsTo("POST", ACCEPT)).toHaveLength(0);

    await userEvent.click(canvas.getByRole("button", { name: "Accept" }));
    await waitFor(() =>
      expect(canvas.queryByText(/nothing is saved until you accept/i)).not.toBeInTheDocument(),
    );
    await expect(canvas.getByText("Lentil soup")).toBeInTheDocument();
    await expect(api.requestsTo("POST", ACCEPT).map((r) => r.body)).toEqual([
      {
        weekStartDate: WEEK,
        seed: 42,
        baseRevision: null,
        inputVersions,
        slots: [
          { day: 0, mealSlot: "dinner", recipeId: 7 },
          { day: 1, mealSlot: "dinner", recipeId: null },
        ],
      },
    ]);
  },
};

export const PreviewThenDiscard: Story = {
  play: async ({ canvasElement }) => {
    const canvas = await openPreview(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Discard" }));
    await expect(await canvas.findByText(/no plan generated/i)).toBeInTheDocument();
    await expect(canvas.queryByText("Lentil soup")).not.toBeInTheDocument();
    await expect(api.requestsTo("POST", ACCEPT)).toHaveLength(0);
  },
};

export const StalePreview: Story = {
  parameters: {
    acceptRoute: {
      method: "POST",
      path: ACCEPT,
      status: 409,
      body: {
        error: {
          message: "Recipes changed since this preview",
          details: { code: "STALE_PREVIEW", staleInputs: ["recipes"] },
        },
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = await openPreview(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Accept" }));
    const alert = await canvas.findByRole("alert");
    await expect(alert).toHaveTextContent("Recipes changed since this preview");

    await userEvent.click(within(alert).getByRole("button", { name: "Preview again" }));
    await canvas.findByText(/nothing is saved until you accept/i);
    await expect(api.requestsTo("POST", PREVIEW)).toHaveLength(2);
  },
};

export const AcceptFails: Story = {
  parameters: {
    acceptRoute: {
      method: "POST",
      path: ACCEPT,
      status: 500,
      body: { error: { message: "Internal Server Error" } },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = await openPreview(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Accept" }));
    await expect(await canvas.findByText("Couldn't save the plan")).toBeInTheDocument();
    await expect(canvas.getByText("Lentil soup")).toBeInTheDocument();
    await expect(canvas.getByRole("button", { name: "Accept" })).toBeEnabled();
  },
};
