import type { Meta, StoryObj } from "@storybook/react-vite";
import { Kbd } from "../shared/ui/Kbd";

const meta: Meta<typeof Kbd> = {
  title: "shared/ui/Kbd",
  component: Kbd,
  args: {
    children: "R",
  },
};

export default meta;
type Story = StoryObj<typeof Kbd>;

export const Default: Story = {};
