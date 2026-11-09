import type { Meta, StoryObj } from "@storybook/react-vite";
import { within } from "storybook/test";
import { FlagTag } from "../shared/ui/FlagTag";
import { expectNoCaps } from "./expectNoCaps";
import { expectTagShape } from "./expectTagShape";

const meta: Meta<typeof FlagTag> = {
  title: "shared/ui/FlagTag",
  component: FlagTag,
  args: {
    count: 2,
  },
};

export default meta;
type Story = StoryObj<typeof FlagTag>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    await expectNoCaps(canvasElement);
    await expectTagShape(within(canvasElement).getByText("2 to check"), "warning");
  },
};
