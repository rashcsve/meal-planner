import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { FormField } from "../shared/ui/FormField";
import { Input } from "../shared/ui/Input";

const meta: Meta<typeof FormField> = {
  title: "shared/ui/FormField",
  component: FormField,
};

export default meta;
type Story = StoryObj<typeof FormField>;

function DefaultStory() {
  const [value, setValue] = useState("");
  return (
    <div
      className="grid items-center gap-x-3 gap-y-2"
      style={{ gridTemplateColumns: "130px 1fr", width: 320 }}
    >
      <FormField id="title" label="Title">
        <Input
          id="title"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
      </FormField>
    </div>
  );
}

export const Default: Story = {
  render: () => <DefaultStory />,
};

export const WithError: Story = {
  render: () => (
    <div
      className="grid items-center gap-x-3 gap-y-2"
      style={{ gridTemplateColumns: "130px 1fr", width: 320 }}
    >
      <FormField id="title" label="Title" error="Title is required">
        <Input id="title" value="" onChange={() => {}} />
      </FormField>
    </div>
  ),
};
