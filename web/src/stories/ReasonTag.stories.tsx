import type { Meta, StoryObj } from "@storybook/react-vite";
import { within } from "storybook/test";
import { ReasonTag } from "../shared/ui/ReasonTag";
import { expectNoCaps } from "./expectNoCaps";
import { expectTagShape, type tones } from "./expectTagShape";

const meta: Meta<typeof ReasonTag> = {
  title: "shared/ui/ReasonTag",
  component: ReasonTag,
};

export default meta;
type Story = StoryObj<typeof ReasonTag>;

const shapeFor =
  (text: string, tone: keyof typeof tones): Story["play"] =>
  async ({ canvasElement }) => {
    await expectNoCaps(canvasElement);
    await expectTagShape(within(canvasElement).getByText(text), tone);
  };

export const Save: Story = {
  args: { variant: "save", children: "saves 60 Kč" },
  play: shapeFor("saves 60 Kč", "ok"),
};
export const Pantry: Story = {
  args: { variant: "pantry", children: "uses pantry" },
  play: shapeFor("uses pantry", "ok"),
};
export const Fast: Story = {
  args: { variant: "fast", children: "20 min" },
  play: shapeFor("20 min", "lock"),
};
