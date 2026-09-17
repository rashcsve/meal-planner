import type { Meta, StoryObj } from "@storybook/react-vite";
import { MemberTargetRow } from "../features/household/MemberTargetRow";
import type { HouseholdMember } from "../features/household/useHousehold";

const member: HouseholdMember = {
  id: 1,
  name: "Svetlana",
  dailyCalorieTarget: 1500,
  dinnerCalorieTarget: 500,
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

export const Default: Story = {};

export const Unconfigured: Story = {
  args: { member: { ...member, dinnerCalorieTarget: null } },
};

export const Saving: Story = { args: { isSaving: true } };
