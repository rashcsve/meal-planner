import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "../shared/ui/Button";

const meta: Meta<typeof Button> = {
  title: "shared/ui/Button",
  component: Button,
  args: {
    children: "Regenerate",
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Primary: Story = { args: { variant: "primary" } };
export const Ghost: Story = { args: { variant: "ghost", children: "Unlock all" } };
export const Danger: Story = { args: { variant: "danger", children: "Delete" } };
export const Disabled: Story = { args: { disabled: true, children: "Save" } };
