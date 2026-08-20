import type { Meta, StoryObj } from "@storybook/react-vite";
import { ErrorState } from "../shared/ui/ErrorState";

const meta: Meta<typeof ErrorState> = {
  title: "shared/ui/ErrorState",
  component: ErrorState,
  args: {
    title: "Couldn't load recipes.",
    message: "Database connection refused.",
  },
};

export default meta;
type Story = StoryObj<typeof ErrorState>;

export const Default: Story = {};

export const WithRequestId: Story = {
  args: {
    requestId: "8f3c-a91d",
  },
};
