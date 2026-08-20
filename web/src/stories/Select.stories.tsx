import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Select } from "../shared/ui/Select";

const meta: Meta<typeof Select> = {
  title: "shared/ui/Select",
  component: Select,
};

export default meta;
type Story = StoryObj<typeof Select>;

const OPTIONS = ["lunch", "dinner", "breakfast", "dessert"];

export const Default: Story = {
  render: () => {
    const [value, setValue] = useState("");
    return (
      <Select
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
  },
};

export const Disabled: Story = {
  render: () => (
    <Select value="lunch" disabled onChange={() => {}} style={{ width: 170 }}>
      <option value="lunch">lunch</option>
    </Select>
  ),
};
