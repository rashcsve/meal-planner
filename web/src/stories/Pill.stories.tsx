import type { Meta, StoryObj } from "@storybook/react-vite";
import { Pill } from "../shared/ui/Pill";

const meta: Meta<typeof Pill> = {
  title: "shared/ui/Pill",
  component: Pill,
  args: {
    children: "chicken",
  },
};

export default meta;
type Story = StoryObj<typeof Pill>;

export const Default: Story = {};
