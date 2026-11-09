import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
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

export const Primary: Story = {
  args: { variant: "primary" },
  play: async ({ canvasElement }) => {
    const button = within(canvasElement).getByRole("button", { name: "Regenerate" });
    await expect(getComputedStyle(button).backgroundColor).toBe("rgb(24, 24, 27)");
  },
};
export const Ghost: Story = { args: { variant: "ghost", children: "Unlock all" } };
export const Danger: Story = { args: { variant: "danger", children: "Delete" } };
export const Disabled: Story = { args: { disabled: true, children: "Save" } };
