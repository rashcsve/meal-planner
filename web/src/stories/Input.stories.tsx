import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { within } from "storybook/test";
import { Input } from "../shared/ui/Input";
import { expectFieldShape, expectLockFocusRing } from "./expectFieldShape";

const meta: Meta<typeof Input> = {
  title: "shared/ui/Input",
  component: Input,
};

export default meta;
type Story = StoryObj<typeof Input>;

function TextStory() {
  const [value, setValue] = useState("");
  return (
    <Input
      aria-label="Search"
      placeholder="Search…"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      style={{ width: 170 }}
    />
  );
}

export const Text: Story = {
  render: () => <TextStory />,
  play: async ({ canvasElement }) => {
    await expectFieldShape(within(canvasElement).getByRole("textbox", { name: "Search" }));
  },
};

export const Focused: Story = {
  render: () => <TextStory />,
  play: async ({ canvasElement }) => {
    await expectLockFocusRing(within(canvasElement).getByRole("textbox", { name: "Search" }));
  },
};

function NumericStory() {
  const [value, setValue] = useState("1400");
  return (
    <Input
      aria-label="Time in minutes"
      type="number"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      style={{ width: 80 }}
    />
  );
}

export const Numeric: Story = {
  render: () => <NumericStory />,
};

export const Disabled: Story = {
  render: () => (
    <Input
      aria-label="Time in minutes"
      value="129"
      disabled
      onChange={() => {}}
      style={{ width: 80 }}
    />
  ),
};
