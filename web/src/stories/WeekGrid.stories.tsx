import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import { WeekGrid } from "../features/week/WeekGrid";
import type { WeekDayRow } from "../features/week/deriveWeekRows";
import { expectNoCaps } from "./expectNoCaps";

const rows: WeekDayRow[] = [
  {
    day: 0,
    date: "2026-09-14",
    dayLabel: "Mon 14",
    locked: true,
    recipeTitle: "Chicken and rice bowl",
    timeMinutes: 30,
    kcalPerPortion: 400,
    portions: 3.25,
    cost: 89,
    members: [
      { memberId: 1, memberName: "Svetlana", servings: 1.25, calories: 500 },
      { memberId: 2, memberName: "Member 2", servings: 2, calories: 800 },
    ],
    reasonTags: [
      { variant: "save", label: "on sale", detail: "promo: Chicken breast on sale at Albert" },
      {
        variant: "pantry",
        label: "uses pantry",
        detail: "uses Rice expiring in 2 day(s)",
      },
    ],
  },
  {
    day: 1,
    date: "2026-09-15",
    dayLabel: "Tue 15",
    locked: false,
    recipeTitle: "Lentil soup",
    timeMinutes: 45,
    kcalPerPortion: null,
    portions: 1,
    cost: null,
    members: [{ memberId: 1, memberName: "Svetlana", servings: 1, calories: null }],
    reasonTags: [],
  },
  {
    day: 2,
    date: "2026-09-16",
    dayLabel: "Wed 16",
    locked: false,
    recipeTitle: null,
    timeMinutes: null,
    kcalPerPortion: null,
    portions: 0,
    cost: null,
    members: [],
    reasonTags: [],
  },
];

function InteractiveWeekGrid() {
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  return (
    <WeekGrid
      rows={rows}
      selectedDay={selectedDay}
      onSelectDay={setSelectedDay}
      onDeselect={() => setSelectedDay(null)}
    />
  );
}

function card(root: HTMLElement, text: string | RegExp) {
  return within(root).getByRole("button", { name: text });
}

const meta: Meta<typeof InteractiveWeekGrid> = {
  title: "features/week/WeekGrid",
  component: InteractiveWeekGrid,
};

export default meta;
type Story = StoryObj<typeof InteractiveWeekGrid>;

export const Default: Story = {};

export const NoneSelected: Story = {
  render: () => (
    <WeekGrid rows={rows} selectedDay={null} onSelectDay={() => {}} onDeselect={() => {}} />
  ),
  play: async ({ canvasElement }) => {
    const filled = card(canvasElement, /Mon 14/);
    const inCard = within(filled);
    await expect(inCard.getByText("Mon 14")).toBeInTheDocument();
    await expect(inCard.getByText("400 kcal a portion · 30 min")).toBeInTheDocument();
    await expect(inCard.getByText("3.25 portions")).toBeInTheDocument();
    await expect(inCard.getByText("on sale")).toBeInTheDocument();
    await expect(filled.querySelector("[data-dish-tile]")).toHaveTextContent(
      "Chicken and rice bowl",
    );
    await expect(getComputedStyle(filled).borderRadius).toBe("8px");
    await expect(filled).not.toHaveTextContent(/Svetlana|Kč/);
    await expectNoCaps(canvasElement);
  },
};

export const LockedBadge: Story = {
  render: () => (
    <WeekGrid rows={rows} selectedDay={null} onSelectDay={() => {}} onDeselect={() => {}} />
  ),
  play: async ({ canvasElement }) => {
    await expect(within(card(canvasElement, /Mon 14/)).getByText("Locked")).toBeInTheDocument();
    await expect(card(canvasElement, /Tue 15/)).not.toHaveTextContent("Locked");
  },
};

export const KcalUnknown: Story = {
  render: () => (
    <WeekGrid rows={rows} selectedDay={null} onSelectDay={() => {}} onDeselect={() => {}} />
  ),
  play: async ({ canvasElement }) => {
    const soup = within(card(canvasElement, /Tue 15/));
    await expect(soup.getByText("45 min")).toBeInTheDocument();
    await expect(soup.getByText("1 portion")).toBeInTheDocument();
    await expect(card(canvasElement, /Tue 15/)).not.toHaveTextContent(/kcal/);
  },
};

export const EmptyDay: Story = {
  render: () => (
    <WeekGrid rows={rows} selectedDay={null} onSelectDay={() => {}} onDeselect={() => {}} />
  ),
  play: async ({ canvasElement }) => {
    const empty = card(canvasElement, /Wed 16/);
    await expect(within(empty).getByText("No recipe assigned")).toBeInTheDocument();
    await expect(empty).not.toHaveTextContent(/portion|kcal/);
  },
};

export const DaySelected: Story = {
  render: () => (
    <WeekGrid rows={rows} selectedDay={1} onSelectDay={() => {}} onDeselect={() => {}} />
  ),
  play: async ({ canvasElement }) => {
    await expect(card(canvasElement, /Tue 15/)).toHaveAttribute("aria-pressed", "true");
    await expect(card(canvasElement, /Mon 14/)).toHaveAttribute("aria-pressed", "false");
  },
};
