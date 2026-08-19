import type { Meta, StoryObj } from "@storybook/react-vite";
import { ReasonTag } from "../shared/ui/ReasonTag";

const meta: Meta<typeof ReasonTag> = {
  title: "shared/ui/ReasonTag",
  component: ReasonTag,
};

export default meta;
type Story = StoryObj<typeof ReasonTag>;

export const Save: Story = { args: { variant: "save", children: "saves 60 Kč" } };
export const Pantry: Story = { args: { variant: "pantry", children: "uses pantry" } };
export const Fast: Story = { args: { variant: "fast", children: "20 min" } };
