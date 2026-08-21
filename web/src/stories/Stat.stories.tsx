import type { Meta, StoryObj } from "@storybook/react-vite";
import { Stat } from "../shared/ui/Stat";

const meta: Meta<typeof Stat> = {
  title: "shared/ui/Stat",
  component: Stat,
};

export default meta;
type Story = StoryObj<typeof Stat>;

export const Default: Story = {
  args: { label: "Kcal / serving", value: 620 },
};

export const WithUnit: Story = {
  args: { label: "Protein / 100g", value: 9, unit: "g" },
};

export const Missing: Story = {
  args: { label: "Fat / 100g", value: null },
  render: (args) => (
    <div className="text-11 text-faint">
      <Stat {...args} />
      (renders nothing when value is null)
    </div>
  ),
};
