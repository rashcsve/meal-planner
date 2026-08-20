import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Filters } from "../shared/ui/Filters";

type FilterValue = "all" | "needsCheck" | "linked";

const meta: Meta = {
  title: "shared/ui/Filters",
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: () => {
    const [value, setValue] = useState<FilterValue>("all");
    return (
      <Filters
        value={value}
        onChange={setValue}
        options={[
          { value: "all", label: "All" },
          { value: "needsCheck", label: "Needs check" },
          { value: "linked", label: "Linked" },
        ]}
      />
    );
  },
};
