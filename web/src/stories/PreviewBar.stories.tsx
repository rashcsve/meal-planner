import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import { PreviewBar } from "../features/week/PreviewBar";

const meta: Meta<typeof PreviewBar> = {
  title: "features/week/PreviewBar",
  component: PreviewBar,
  args: {
    status: "ready",
    onAccept: fn(),
    onDiscard: fn(),
    onRegenerate: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof PreviewBar>;

export const Ready: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(/nothing is saved until you accept/i)).toBeInTheDocument();
    await userEvent.click(canvas.getByRole("button", { name: "Accept" }));
    await expect(args.onAccept).toHaveBeenCalledOnce();
    await userEvent.click(canvas.getByRole("button", { name: "Try again" }));
    await expect(args.onRegenerate).toHaveBeenCalledOnce();
    await userEvent.click(canvas.getByRole("button", { name: "Discard" }));
    await expect(args.onDiscard).toHaveBeenCalledOnce();
  },
};

export const Busy: Story = {
  args: { status: "busy" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    for (const name of ["Accept", "Try again", "Discard"]) {
      await expect(canvas.getByRole("button", { name })).toBeDisabled();
    }
  },
};

export const Stale: Story = {
  args: { status: "stale", message: "Recipes changed since this preview." },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("alert")).toHaveTextContent(
      "Recipes changed since this preview.",
    );
    await expect(canvas.queryByRole("button", { name: "Accept" })).not.toBeInTheDocument();
    await userEvent.click(canvas.getByRole("button", { name: "Preview again" }));
    await expect(args.onRegenerate).toHaveBeenCalledOnce();
  },
};

export const AcceptFailed: Story = {
  args: { status: "error", message: "Network down" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("alert")).toHaveTextContent("Network down");
    await expect(canvas.getByRole("button", { name: "Accept" })).toBeEnabled();
  },
};
