import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { SearchInput } from "../shared/ui/SearchInput";

const meta: Meta<typeof SearchInput> = {
  title: "shared/ui/SearchInput",
  component: SearchInput,
};

export default meta;
type Story = StoryObj<typeof SearchInput>;

function DefaultStory() {
  const [value, setValue] = useState("");
  return (
    <SearchInput
      placeholder="Search…"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      style={{ width: 170 }}
    />
  );
}

export const Default: Story = {
  render: () => <DefaultStory />,
};
