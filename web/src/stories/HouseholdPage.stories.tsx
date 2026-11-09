import { useState, type ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HouseholdPage } from "../features/household/HouseholdPage";
import { mockApi, type MockRoute } from "./mockApi";
import { expectNoCaps } from "./expectNoCaps";

const SETTINGS = /\/api\/household\/settings$/;
const MEMBERS = /\/api\/household\/members$/;
const PROPOSAL = /\/api\/household\/share-proposal$/;

const settings = {
  id: 1,
  weeklyBudgetCzk: 700,
  startDayOfWeek: 1,
  timezone: "Europe/Prague",
  standardPortionTargetKcal: null,
  standardPortionConfirmedAt: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

function member(id: number, name: string, dinnerCalorieTarget: number) {
  return {
    id,
    name,
    dailyCalorieTarget: dinnerCalorieTarget * 2.5,
    dinnerCalorieTarget,
    confirmedShare: null,
    shareConfirmedAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

const members = [member(1, "Svetlana", 600), member(2, "Petr", 800)];

const proposal = {
  targetKcal: 800,
  shares: [
    { memberId: 1, share: 0.75 },
    { memberId: 2, share: 1 },
  ],
};

const never = () => new Promise(() => {});

function routes(overrides: Partial<Record<"settings" | "members" | "proposal", MockRoute>>) {
  return [
    overrides.settings ?? { method: "GET", path: SETTINGS, body: settings },
    overrides.members ?? { method: "GET", path: MEMBERS, body: members },
    overrides.proposal ?? { method: "GET", path: PROPOSAL, body: proposal },
  ];
}

let api: ReturnType<typeof mockApi>;

function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: false } } }),
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const meta: Meta<typeof HouseholdPage> = {
  title: "features/household/HouseholdPage",
  component: HouseholdPage,
  decorators: [
    (Story) => (
      <Providers>
        <Story />
      </Providers>
    ),
  ],
  beforeEach: ({ parameters }) => {
    api = mockApi(routes(parameters.householdRoutes ?? {}));
    return () => api.restore();
  },
};

export default meta;
type Story = StoryObj<typeof HouseholdPage>;

async function expectFrame(canvas: ReturnType<typeof within>) {
  await expect(canvas.getByRole("heading", { level: 1, name: "Household" })).toBeInTheDocument();
  await expect(canvas.getByText("Everything the planner reads before it runs")).toBeInTheDocument();
}

export const Loaded: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByLabelText("Dinner calorie target for Petr");
    await expectFrame(canvas);
    await expect(canvas.getByLabelText("Weekly budget")).toHaveValue(700);
    await expect(canvas.getByLabelText("Dinner calorie target for Svetlana")).toHaveValue(600);
    await expectNoCaps(canvasElement);
  },
};

export const Loading: Story = {
  parameters: {
    householdRoutes: {
      settings: { method: "GET", path: SETTINGS, body: never },
      members: { method: "GET", path: MEMBERS, body: never },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expectFrame(canvas);
    await expect(canvas.getByRole("status", { name: "Loading household" })).toBeInTheDocument();
  },
};

export const LoadError: Story = {
  parameters: {
    householdRoutes: {
      members: {
        method: "GET",
        path: MEMBERS,
        status: 500,
        body: { error: { message: "Server down" } },
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const alert = await canvas.findByRole("alert");
    await expect(alert).toHaveTextContent("Couldn't load household settings");
    await expectFrame(canvas);
  },
};

export const NoMembers: Story = {
  parameters: {
    householdRoutes: {
      members: { method: "GET", path: MEMBERS, body: [] },
      proposal: { method: "GET", path: PROPOSAL, body: { targetKcal: 0, shares: [] } },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByText("No one in the household yet.");
    await expectFrame(canvas);
    await expect(canvas.getByLabelText("Weekly budget")).toBeInTheDocument();
  },
};
