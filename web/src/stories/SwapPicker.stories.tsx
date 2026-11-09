import { useState, type ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { SwapPicker } from "../features/week/SwapPicker";
import { mockApi, type MockRoute } from "./mockApi";

const WEEK = "2026-11-02";
const CANDIDATES = new RegExp(`/api/plans/${WEEK}/slots/0/dinner/candidates`);
const REPLACE = new RegExp(`/api/plans/${WEEK}/slots/0/dinner$`);

function week(recipeId: number | null) {
  return {
    id: 1,
    weekStartDate: WEEK,
    revision: 3,
    seed: 42,
    slots: [
      {
        day: 0,
        mealSlot: "dinner",
        recipeId,
        locked: false,
        memberServings: recipeId === null ? [] : [{ memberId: 1, servings: 1 }],
        reasons: [],
        recipeSnapshot: null,
      },
    ],
    violations: [],
    evaluation: { status: "current", staleInputs: [] },
  };
}

function candidate(recipeId: number, weekCostDeltaCzk: number | null, kcalDelta: number | null) {
  return {
    recipeId,
    memberServings: [{ memberId: 1, servings: 1 }],
    score: 1,
    violations:
      recipeId === 9
        ? [
            {
              slot: null,
              constraint: "budget",
              detail: "Over weekly budget by 40 CZK",
              severity: 1,
            },
          ]
        : [],
    consequences: {
      weekCostCzk: 1340,
      weekCostDeltaCzk,
      members: [{ memberId: 1, dinnerKcal: 520, dinnerKcalDelta: kcalDelta }],
    },
  };
}

const recipes = [
  { id: 7, title: "Lentil soup", time: 45, cost: 120, servings: 4, kcalPerServing: 400 },
  { id: 8, title: "Pasta bake", time: 30, cost: 90, servings: 4, kcalPerServing: 520 },
  { id: 9, title: "Salmon bowl", time: 25, cost: 260, servings: 2, kcalPerServing: 520 },
];

function routes(recipeId: number | null, total: number): MockRoute[] {
  const deltas = recipeId === null ? [null, null] : [40, 120];
  return [
    { method: "GET", path: /\/api\/household\/members$/, body: [{ id: 1, name: "Svetlana" }] },
    { method: "GET", path: /\/api\/recipes$/, body: recipes },
    { method: "GET", path: new RegExp(`/api/plans/${WEEK}$`), body: week(recipeId) },
    {
      method: "GET",
      path: CANDIDATES,
      body: {
        total,
        candidates: [candidate(8, deltas[0], deltas[1]), candidate(9, deltas[0], deltas[1])],
        suggestions: [],
      },
    },
    { method: "PUT", path: REPLACE, body: { ...week(8).slots[0], recipeId: 8, revision: 4 } },
  ];
}

let api: ReturnType<typeof mockApi>;

function WeekMarker() {
  const location = useLocation();
  return <p>Week page at {location.pathname + location.search}</p>;
}

function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
      }),
  );
  return (
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[`/plan?start=${WEEK}`, `/plan/${WEEK}/swap/0/dinner`]}>
        <Routes>
          <Route path="/plan" element={<WeekMarker />} />
          <Route path="/plan/:week/swap/:day/:mealSlot" element={children} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

const meta: Meta<typeof SwapPicker> = {
  title: "features/week/SwapPicker",
  component: SwapPicker,
  decorators: [
    (Story) => (
      <Providers>
        <Story />
      </Providers>
    ),
  ],
  beforeEach: ({ parameters }) => {
    api = mockApi(
      routes(parameters.recipeId === undefined ? 7 : parameters.recipeId, parameters.total ?? 2),
    );
    return () => api.restore();
  },
};

export default meta;
type Story = StoryObj<typeof SwapPicker>;

export const ListsCandidates: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const pasta = await canvas.findByRole("button", { name: /Pasta bake/ });
    await expect(pasta).toHaveTextContent("1340 CZK (+40)");
    await expect(pasta).toHaveTextContent("Svetlana 520 kcal (+120)");
    const salmon = canvas.getByRole("button", { name: /Salmon bowl/ });
    await expect(salmon).toHaveTextContent("Over weekly budget by 40 CZK");
    await expect(canvas.getByText(/Lentil soup/)).toBeInTheDocument();
  },
};

export const CancelDoesNotMutate: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByRole("button", { name: /Pasta bake/ });
    await userEvent.click(canvas.getByRole("button", { name: "Cancel" }));
    await expect(await canvas.findByText(`Week page at /plan?start=${WEEK}`)).toBeInTheDocument();
    await expect(api.requestsTo("PUT", REPLACE)).toHaveLength(0);
  },
};

export const ChooseReplaces: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole("button", { name: /Pasta bake/ }));
    await expect(await canvas.findByText(`Week page at /plan?start=${WEEK}`)).toBeInTheDocument();
    await expect(api.requestsTo("PUT", REPLACE).map((r) => r.body)).toEqual([
      { recipeId: 8, expectedRevision: 3 },
    ]);
  },
};

export const EmptySlot: Story = {
  parameters: { recipeId: null },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const pasta = await canvas.findByRole("button", { name: /Pasta bake/ });
    await expect(pasta).toHaveTextContent("1340 CZK");
    await expect(pasta).not.toHaveTextContent("(+");
    await expect(canvas.getByText(/No recipe assigned/)).toBeInTheDocument();
  },
};

export const Paging: Story = {
  parameters: { total: 25 },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByRole("button", { name: /Pasta bake/ });
    await expect(canvas.getByRole("button", { name: "Previous" })).toBeDisabled();
    await userEvent.click(canvas.getByRole("button", { name: "Next" }));
    await waitFor(() =>
      expect(api.requestsTo("GET", CANDIDATES).some((r) => r.url.includes("offset=20"))).toBe(true),
    );
  },
};
