import type { Meta, StoryObj } from "@storybook/react-vite";
import { CloseButton } from "../shared/ui/CloseButton";

const meta: Meta<typeof CloseButton> = {
  title: "shared/ui/CloseButton",
  component: CloseButton,
};

export default meta;
type Story = StoryObj<typeof CloseButton>;

export const Default: Story = {};
