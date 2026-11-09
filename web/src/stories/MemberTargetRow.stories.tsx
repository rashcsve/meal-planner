import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import { MemberTargetRow } from "../features/household/MemberTargetRow";
import type { HouseholdMember } from "../features/household/useHousehold";

const member: HouseholdMember = {
  id: 1,
  name: "Svetlana",
  dailyCalorieTarget: 1500,
  dinnerCalorieTarget: 500,
  confirmedShare: null,
  shareConfirmedAt: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const meta: Meta<typeof MemberTargetRow> = {
  title: "features/household/MemberTargetRow",
  component: MemberTargetRow,
  args: {
    member,
    onSave: () => {},
    isSaving: false,
  },
};

export default meta;
type Story = StoryObj<typeof MemberTargetRow>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Svetlana")).toBeInTheDocument();
    await expect(canvas.getByText("about 500 kcal at dinner")).toBeInTheDocument();
    const avatar = canvas.getByText("S");
    await expect(avatar).toHaveAttribute("aria-hidden", "true");
    await expect(canvas.getByLabelText("Dinner calorie target for Svetlana")).toHaveValue(500);
    await expect(canvas.getByText("kcal", { exact: true })).toBeInTheDocument();
  },
};

export const Unconfigured: Story = {
  args: { member: { ...member, dinnerCalorieTarget: null } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("No dinner target yet")).toBeInTheDocument();
    await expect(canvas.queryByText(/kcal at dinner/)).not.toBeInTheDocument();
  },
};

export const Saving: Story = { args: { isSaving: true } };
