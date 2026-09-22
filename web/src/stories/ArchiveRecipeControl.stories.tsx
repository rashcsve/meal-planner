import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import { ArchiveRecipeControl } from "../features/recipes/ArchiveRecipeControl";

const meta: Meta<typeof ArchiveRecipeControl> = {
  title: "features/recipes/ArchiveRecipeControl",
  component: ArchiveRecipeControl,
  args: {
    onArchive: () => {},
    onCancel: () => {},
    isArchiving: false,
  },
};

export default meta;
type Story = StoryObj<typeof ArchiveRecipeControl>;

export const Default: Story = {};

export const Confirming: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Archive recipe" }));
    await expect(canvas.getByRole("button", { name: "Confirm archive" })).toBeInTheDocument();
  },
};

export const ArchiveFailed: Story = {
  args: { error: "Recipe not found" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Archive recipe" }));
    await expect(canvas.getByText("Recipe not found")).toBeInTheDocument();
  },
};

export const ConfirmsArchive: Story = {
  args: { onArchive: fn() },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Archive recipe" }));
    await userEvent.click(canvas.getByRole("button", { name: "Confirm archive" }));

    await expect(args.onArchive).toHaveBeenCalled();
  },
};

export const CancelReturnsToButton: Story = {
  args: { onCancel: fn() },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Archive recipe" }));
    await userEvent.click(canvas.getByRole("button", { name: "Cancel" }));
    await expect(canvas.getByRole("button", { name: "Archive recipe" })).toBeInTheDocument();
    await expect(args.onCancel).toHaveBeenCalled();
  },
};
