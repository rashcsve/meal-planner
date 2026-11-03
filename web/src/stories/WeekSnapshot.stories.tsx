import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import type { RecipeSnapshot } from "shared";
import { WeekGrid } from "../features/week/WeekGrid";
import { deriveWeekRows } from "../features/week/deriveWeekRows";
import { deriveMealDetail } from "../features/week/deriveMealDetail";
import type { PlanSlot } from "../features/week/useWeek";
import type { RecipeCatalogEntry } from "../shared/api/recipeCatalog";
import type { HouseholdMemberEntry } from "../shared/api/household";

const weekStartDate = "2026-09-14";

const members = [{ id: 1, name: "Svetlana" }] as HouseholdMemberEntry[];

const snapshot: RecipeSnapshot = {
  title: "Snapshot curry",
  time: 40,
  cost: 100,
  meal: "dinner",
  cuisine: "indian",
  proteinSource: "chickpeas",
  diet: "vegan",
  servings: 2,
  kcalPerServing: 400,
  ingredients: [
    {
      id: 11,
      ingredientId: 5,
      name: "Chickpeas",
      displayAmount: 200,
      displayUnit: "g",
      amountBase: 200,
      baseUnit: "g",
      isOptional: false,
    },
  ],
};

const liveRecipe = {
  id: 7,
  title: "Live curry",
  time: 15,
  cost: 50,
  meal: "dinner",
  cuisine: "thai",
  proteinSource: "tofu",
  diet: "vegan",
  servings: 4,
  kcalPerServing: 900,
} as RecipeCatalogEntry;

function slot(recipeSnapshot: RecipeSnapshot | null): PlanSlot {
  return {
    day: 0,
    mealSlot: "dinner",
    recipeId: 7,
    locked: false,
    reasons: [],
    memberServings: [{ memberId: 1, servings: 1 }],
    recipeSnapshot,
  } as unknown as PlanSlot;
}

function Grid({ withSnapshot }: { withSnapshot: boolean }) {
  const rows = deriveWeekRows(
    weekStartDate,
    [slot(withSnapshot ? snapshot : null)],
    [liveRecipe],
    members,
  );
  return <WeekGrid rows={rows} selectedDay={null} onSelectDay={() => {}} onDeselect={() => {}} />;
}

const meta: Meta<typeof Grid> = {
  title: "features/week/WeekSnapshot",
  component: Grid,
};

export default meta;
type Story = StoryObj<typeof Grid>;

export const RowUsesSnapshot: Story = {
  args: { withSnapshot: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Snapshot curry")).toBeInTheDocument();
    await expect(canvas.queryByText("Live curry")).not.toBeInTheDocument();
    const [row] = deriveWeekRows(weekStartDate, [slot(snapshot)], [liveRecipe], members);
    await expect(row?.timeMinutes).toBe(40);
    await expect(row?.cost).toBe(50);
    await expect(row?.members[0]?.calories).toBe(400);
  },
};

export const RowFallsBackToLive: Story = {
  args: { withSnapshot: false },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Live curry")).toBeInTheDocument();
  },
};

export const DetailUsesSnapshot: Story = {
  args: { withSnapshot: true },
  play: async () => {
    const detail = deriveMealDetail(slot(snapshot), undefined, members);
    await expect(detail?.title).toBe("Snapshot curry");
    await expect(detail?.tags).toEqual(["indian", "chickpeas", "vegan"]);
    await expect(detail?.members[0]?.calories).toBe(400);
    await expect(detail?.ingredients).toEqual([
      { id: 11, label: "100 g Chickpeas", incomplete: false },
    ]);
  },
};
