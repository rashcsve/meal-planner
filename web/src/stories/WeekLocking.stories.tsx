import type { ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { WeekPage } from "../features/week/WeekPage";
import { weekKeys, type PlanWeek } from "../features/week/useWeek";
import { mockApi, type MockRoute } from "./mockApi";

const WEEK = "2026-11-02";
const WEEK_PATH = new RegExp(`/api/plans/${WEEK}$`);
const LOCK = new RegExp(`/api/plans/${WEEK}/slots/0/dinner/lock$`);

function slot(locked: boolean) {
  return {
    day: 0,
    mealSlot: "dinner" as const,
    recipeId: 7,
    locked,
    memberServings: [{ memberId: 1, servings: 1 }],
    reasons: [],
    recipeSnapshot: null,
  };
}

function week(revision: number, locked: boolean) {
  return {
    id: 1,
    weekStartDate: WEEK,
    revision,
    seed: 42,
    slots: [slot(locked)],
    violations: [],
    evaluation: { status: "current", staleInputs: [] },
  };
}

function deferred() {
  let resolve!: (value: unknown) => void;
  const promise = new Promise<unknown>((r) => (resolve = r));
  return { promise, resolve };
}

let api: ReturnType<typeof mockApi>;
let client: QueryClient;
let unlock: ReturnType<typeof deferred>;
let refetch: ReturnType<typeof deferred>;

function routes(weekBody: MockRoute["body"], lockStatus: number): MockRoute[] {
  return [
    { method: "DELETE", path: LOCK, status: lockStatus, body: () => unlock.promise },
    {
      method: "GET",
      path: /\/api\/household\/settings$/,
      body: { startDayOfWeek: 1, timezone: "Europe/Prague" },
    },
    { method: "GET", path: /\/api\/household\/members$/, body: [{ id: 1, name: "Svetlana" }] },
    {
      method: "GET",
      path: /\/api\/recipes$/,
      body: [
        { id: 7, title: "Lentil soup", time: 45, cost: 120, servings: 4, kcalPerServing: 400 },
      ],
    },
    {
      method: "GET",
      path: /\/api\/recipes\/7$/,
      body: { id: 7, title: "Lentil soup", ingredients: [] },
    },
    {
      method: "GET",
      path: /\/candidates/,
      body: { total: 0, candidates: [], suggestions: [] },
    },
    { method: "GET", path: WEEK_PATH, body: weekBody },
  ];
}

function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[`/plan?start=${WEEK}`]}>{children}</MemoryRouter>
    </QueryClientProvider>
  );
}

const meta: Meta<typeof WeekPage> = {
  title: "features/week/WeekLocking",
  component: WeekPage,
  decorators: [
    (Story) => (
      <Providers>
        <Story />
      </Providers>
    ),
  ],
  beforeEach: ({ parameters }) => {
    unlock = deferred();
    refetch = deferred();
    let weekCalls = 0;
    const weekBody = parameters.holdRefetch
      ? () => (++weekCalls === 1 ? week(3, true) : refetch.promise)
      : () =>
          !parameters.lockStatus && api.requestsTo("DELETE", LOCK).length
            ? week(4, false)
            : week(3, true);
    api = mockApi(routes(weekBody, parameters.lockStatus ?? 200));
    client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    return () => api.restore();
  },
};

export default meta;
type Story = StoryObj<typeof WeekPage>;

async function clickUnlock(canvasElement: HTMLElement) {
  const canvas = within(canvasElement);
  await userEvent.click(await canvas.findByRole("button", { name: /Lentil soup/ }));
  await userEvent.click(await canvas.findByRole("button", { name: "Unlock to edit" }));
  return canvas;
}

export const UnlockShowsBeforeServerAnswers: Story = {
  play: async ({ canvasElement }) => {
    const canvas = await clickUnlock(canvasElement);

    await waitFor(() => expect(canvas.queryAllByText("Locked")).toHaveLength(0));
    await expect(api.requestsTo("DELETE", LOCK).map((r) => r.body)).toEqual([
      { expectedRevision: 3 },
    ]);

    unlock.resolve({ ...slot(false), revision: 4 });
    await waitFor(() => expect(api.requestsTo("GET", WEEK_PATH).length).toBeGreaterThan(1));
    await expect(canvas.queryAllByText("Locked")).toHaveLength(0);
  },
};

export const UnlockConflictRollsBackAndRefetches: Story = {
  parameters: { lockStatus: 409 },
  play: async ({ canvasElement }) => {
    const canvas = await clickUnlock(canvasElement);
    await waitFor(() => expect(canvas.queryAllByText("Locked")).toHaveLength(0));

    unlock.resolve({
      error: {
        message: "Plan was changed by another request",
        details: { code: "STALE_PLAN_REVISION" },
      },
    });

    await expect(await canvas.findByText("Couldn't unlock meal")).toBeInTheDocument();
    await expect(canvas.getAllByText("Locked").length).toBeGreaterThan(0);
    await waitFor(() => expect(api.requestsTo("GET", WEEK_PATH)).toHaveLength(2));
  },
};

export const LateUnlockResponseKeepsNewerRevision: Story = {
  parameters: { holdRefetch: true },
  play: async ({ canvasElement }) => {
    await clickUnlock(canvasElement);

    client.setQueryData(weekKeys.detail(WEEK), week(5, true));
    unlock.resolve({ ...slot(false), revision: 4 });

    await waitFor(() => expect(api.requestsTo("GET", WEEK_PATH)).toHaveLength(2));
    const cached = client.getQueryData<PlanWeek>(weekKeys.detail(WEEK));
    await expect(cached?.revision).toBe(5);
    await expect(cached?.slots[0].locked).toBe(true);
    refetch.resolve(week(5, true));
  },
};

export const CardUnlockConflictShowsErrorOnCard: Story = {
  parameters: { lockStatus: 409 },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole("button", { name: "Unlock Mon 2" }));

    await waitFor(() =>
      expect(canvas.getByRole("button", { name: "Lock Mon 2" })).toHaveAttribute(
        "aria-pressed",
        "false",
      ),
    );
    await expect(api.requestsTo("DELETE", LOCK).map((r) => r.body)).toEqual([
      { expectedRevision: 3 },
    ]);
    await expect(canvas.queryByRole("button", { name: "Unlock to edit" })).toBeNull();

    unlock.resolve({
      error: {
        message: "Plan was changed by another request",
        details: { code: "STALE_PLAN_REVISION" },
      },
    });

    await expect(await canvas.findByRole("alert")).toHaveTextContent("Couldn't unlock meal");
    await expect(canvas.getByRole("button", { name: "Unlock Mon 2" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  },
};
