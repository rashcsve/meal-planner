import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Input } from "../shared/ui/Input";

const meta: Meta<typeof Input> = {
  title: "shared/ui/Input",
  component: Input,
};

export default meta;
type Story = StoryObj<typeof Input>;

export const Text: Story = {
  render: () => {
    const [value, setValue] = useState("");
    return (
      <Input
        placeholder="Search…"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        style={{ width: 170 }}
      />
    );
  },
};

export const Numeric: Story = {
  render: () => {
    const [value, setValue] = useState("1400");
    return (
      <Input
        type="number"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        style={{ width: 80 }}
      />
    );
  },
};

export const Disabled: Story = {
  render: () => <Input value="129" disabled onChange={() => {}} style={{ width: 80 }} />,
};
