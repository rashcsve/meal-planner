import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { within } from "storybook/test";
import { Select } from "../shared/ui/Select";
import { expectFieldShape, expectLockFocusRing } from "./expectFieldShape";

const meta: Meta<typeof Select> = {
  title: "shared/ui/Select",
  component: Select,
};

export default meta;
type Story = StoryObj<typeof Select>;

const OPTIONS = ["lunch", "dinner", "breakfast", "dessert"];

function DefaultStory() {
  const [value, setValue] = useState("");
  return (
    <Select
      aria-label="Meal"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      style={{ width: 170 }}
    >
      <option value="">—</option>
      {OPTIONS.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </Select>
  );
}

export const Default: Story = {
  render: () => <DefaultStory />,
  play: async ({ canvasElement }) => {
    await expectFieldShape(within(canvasElement).getByRole("combobox", { name: "Meal" }));
  },
};

export const Focused: Story = {
  render: () => <DefaultStory />,
  play: async ({ canvasElement }) => {
    await expectLockFocusRing(within(canvasElement).getByRole("combobox", { name: "Meal" }));
  },
};

export const Disabled: Story = {
  render: () => (
    <Select aria-label="Meal" value="lunch" disabled onChange={() => {}} style={{ width: 170 }}>
      <option value="lunch">lunch</option>
    </Select>
  ),
};
