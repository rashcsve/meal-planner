import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { WeekGrid } from "../features/week/WeekGrid";
import type { WeekDayRow } from "../features/week/deriveWeekRows";

const rows: WeekDayRow[] = [
  {
    day: 0,
    date: "2026-09-14",
    dayLabel: "Mon 14",
    locked: true,
    recipeTitle: "Chicken and rice bowl",
    timeMinutes: 30,
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
};

export const DaySelected: Story = {
  render: () => (
    <WeekGrid rows={rows} selectedDay={1} onSelectDay={() => {}} onDeselect={() => {}} />
  ),
};
