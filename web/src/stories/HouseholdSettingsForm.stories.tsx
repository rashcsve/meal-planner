import type { Meta, StoryObj } from "@storybook/react-vite";
import { HouseholdSettingsForm } from "../features/household/HouseholdSettingsForm";

const meta: Meta<typeof HouseholdSettingsForm> = {
  title: "features/household/HouseholdSettingsForm",
  component: HouseholdSettingsForm,
  args: {
    defaultValues: { weeklyBudgetCzk: 2500, startDayOfWeek: 1, timezone: "Europe/Prague" },
    onSubmit: () => {},
    isSaving: false,
  },
};

export default meta;
type Story = StoryObj<typeof HouseholdSettingsForm>;

export const Default: Story = {};

export const Saving: Story = { args: { isSaving: true } };

export const SaveError: Story = {
  args: { error: "Couldn't reach the server" },
};
