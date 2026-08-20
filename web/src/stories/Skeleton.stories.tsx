import type { Meta, StoryObj } from "@storybook/react-vite";
import { Skeleton } from "../shared/ui/Skeleton";

const meta: Meta<typeof Skeleton> = {
  title: "shared/ui/Skeleton",
  component: Skeleton,
};

export default meta;
type Story = StoryObj<typeof Skeleton>;

export const Bar: Story = { args: { className: "h-3 w-40" } };

export const TableRow: Story = {
  render: () => (
    <div className="flex items-center gap-3 border-b border-hair px-3 py-2">
      <Skeleton className="h-3 w-32" />
      <Skeleton className="h-3 w-12" />
      <Skeleton className="ml-auto h-3 w-16" />
    </div>
  ),
};

export const Card: Story = {
  render: () => (
    <div className="flex w-64 flex-col gap-2 rounded border border-line bg-card p-3">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  ),
};
