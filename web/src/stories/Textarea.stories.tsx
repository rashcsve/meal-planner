import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Textarea } from "../shared/ui/Textarea";

const meta: Meta<typeof Textarea> = {
  title: "shared/ui/Textarea",
  component: Textarea,
};

export default meta;
type Story = StoryObj<typeof Textarea>;

function DefaultStory() {
  const [value, setValue] = useState("");
  return (
    <Textarea
      aria-label="Description"
      rows={3}
      placeholder="Add a description…"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      style={{ width: 260 }}
    />
  );
}

export const Default: Story = {
  render: () => <DefaultStory />,
};

export const Disabled: Story = {
  render: () => (
    <Textarea
      aria-label="Description"
      rows={3}
      value="Weeknight curry with rice."
      disabled
      onChange={() => {}}
      style={{ width: 260 }}
    />
  ),
};
