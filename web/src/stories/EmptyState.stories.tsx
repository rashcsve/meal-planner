import type { Meta, StoryObj } from "@storybook/react-vite";
import { EmptyState } from "../shared/ui/EmptyState";
import { Button } from "../shared/ui/Button";

const meta: Meta<typeof EmptyState> = {
  title: "shared/ui/EmptyState",
  component: EmptyState,
  args: {
    message: "No recipes yet.",
    action: <Button>Add a recipe</Button>,
  },
};

export default meta;
type Story = StoryObj<typeof EmptyState>;

export const Default: Story = {};

export const WeekPlan: Story = {
  args: {
    message: "This week is empty.",
    action: <Button>Plan the week</Button>,
  },
};
