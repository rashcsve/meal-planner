import { useState, type ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { MealDetailRail } from "../features/week/MealDetailRail";
import { mockApi, type MockRoute } from "./mockApi";

const WEEK = "2026-11-02";
const CANDIDATES = new RegExp(`/api/plans/${WEEK}/slots/0/dinner/candidates`);
const LOCK = new RegExp(`/api/plans/${WEEK}/slots/0/dinner/lock$`);

const recipes = [
  { id: 7, title: "Lentil soup", time: 45, cost: 120, servings: 4, kcalPerServing: 400 },
  { id: 8, title: "Pasta bake", time: 30, cost: 90, servings: 4, kcalPerServing: 520 },
  { id: 9, title: "Salmon bowl", time: 25, cost: 260, servings: 2, kcalPerServing: 520 },
  { id: 10, title: "Bean chili", time: 50, cost: 110, servings: 4, kcalPerServing: 480 },
  { id: 11, title: "Mushroom risotto", time: 40, cost: 140, servings: 4, kcalPerServing: 560 },
];

const members = [{ id: 1, name: "Svetlana" }];

function candidate(recipeId: number) {
  return {
    recipeId,
    memberServings: [{ memberId: 1, servings: 1 }],
    score: 1,
    violations: [],
    consequences: {
      weekCostCzk: 1340,
      weekCostDeltaCzk: null,
      members: [{ memberId: 1, dinnerKcal: 520, dinnerKcalDelta: null }],
    },
  };
}

const routes: MockRoute[] = [
  { method: "PUT", path: LOCK, body: { revision: 4, locked: true } },
  {
    method: "GET",
    path: /\/api\/recipes\/7$/,
    body: {
      ...recipes[0],
      meal: null,
      cuisine: null,
      proteinSource: null,
      diet: null,
      ingredients: [],
    },
  },
  {
    method: "GET",
    path: CANDIDATES,
    body: {
      total: 5,
      candidates: [7, 8, 9, 10, 11].map(candidate),
      suggestions: [8, 9, 10].map(candidate),
    },
  },
];

function slot(recipeId: number | null, locked = false) {
  return {
    day: 0,
    mealSlot: "dinner" as const,
    recipeId,
    locked,
    memberServings: recipeId === null ? [] : [{ memberId: 1, servings: 1 }],
    reasons: [],
    recipeSnapshot: null,
  };
}

let api: ReturnType<typeof mockApi>;

function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: false } } }),
  );
  return (
    <QueryClientProvider client={client}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
}

const meta: Meta<typeof MealDetailRail> = {
  title: "features/week/MealDetailRail",
  component: MealDetailRail,
  args: {
    weekStartDate: WEEK,
    revision: 3,
    slot: slot(7) as never,
    members: members as never,
    recipes: recipes as never,
    onClose: () => {},
  },
  decorators: [
    (Story) => (
      <Providers>
        <Story />
      </Providers>
    ),
  ],
  beforeEach: () => {
    api = mockApi(routes);
    return () => api.restore();
  },
};

export default meta;
type Story = StoryObj<typeof MealDetailRail>;

async function expectTopThreeAndLink(canvasElement: HTMLElement) {
  const canvas = within(canvasElement);
  await canvas.findByRole("button", { name: /Pasta bake/ });
  await expect(canvas.getByRole("button", { name: /Salmon bowl/ })).toBeInTheDocument();
  await expect(canvas.getByRole("button", { name: /Bean chili/ })).toBeInTheDocument();
  await expect(canvas.queryByRole("button", { name: /Mushroom risotto/ })).not.toBeInTheDocument();
  await expect(canvas.getByRole("link", { name: "See all options" })).toHaveAttribute(
    "href",
    `/plan/${WEEK}/swap/0/dinner`,
  );
}

export const FilledSlotShowsTopThreeSuggestions: Story = {
  play: async ({ canvasElement }) => {
    await expectTopThreeAndLink(canvasElement);
    await expect(
      within(canvasElement).queryByRole("button", { name: /Lentil soup/ }),
    ).not.toBeInTheDocument();
  },
};

export const EmptySlotShowsSuggestionsAndLink: Story = {
  args: { slot: slot(null) as never },
  play: async ({ canvasElement }) => {
    await expectTopThreeAndLink(canvasElement);
  },
};

export const LockedSlotHasNoSuggestionsOrLink: Story = {
  args: { slot: slot(7, true) as never },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByRole("button", { name: "Unlock to edit" });
    await waitFor(() => expect(canvas.getByText("Lentil soup")).toBeInTheDocument());
    await expect(canvas.queryByRole("link", { name: "See all options" })).not.toBeInTheDocument();
    await expect(api.requestsTo("GET", CANDIDATES)).toHaveLength(0);
  },
};

export const FilledUnlockedSlotLocksFromRail: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole("button", { name: "Lock" }));
    await waitFor(() => expect(api.requestsTo("PUT", LOCK)).toHaveLength(1));
    await expect(api.requestsTo("PUT", LOCK)[0].body).toEqual({ expectedRevision: 3 });
  },
};

export const LockFailureShowsLockError: Story = {
  beforeEach: () => {
    api.restore();
    api = mockApi([
      { method: "PUT", path: LOCK, status: 409, body: { error: { message: "Plan changed" } } },
      ...routes,
    ]);
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole("button", { name: "Lock" }));
    await canvas.findByText("Couldn't lock meal");
  },
};

export const EmptySlotHasNoLockButton: Story = {
  args: { slot: slot(null) as never },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByRole("button", { name: /Pasta bake/ });
    await expect(canvas.queryByRole("button", { name: "Lock" })).not.toBeInTheDocument();
  },
};

export const LockedSlotHasNoLockButton: Story = {
  args: { slot: slot(7, true) as never },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByRole("button", { name: "Unlock to edit" });
    await expect(canvas.queryByRole("button", { name: "Lock" })).not.toBeInTheDocument();
  },
};
