import type { Meta, StoryObj } from "@storybook/react-vite";
import { FlagTag } from "../shared/ui/FlagTag";

const meta: Meta<typeof FlagTag> = {
  title: "shared/ui/FlagTag",
  component: FlagTag,
  args: {
    count: 2,
  },
};

export default meta;
type Story = StoryObj<typeof FlagTag>;

export const Default: Story = {};
