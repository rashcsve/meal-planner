import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { Kbd } from "../shared/ui/Kbd";

const meta: Meta<typeof Kbd> = {
  title: "shared/ui/Kbd",
  component: Kbd,
  args: {
    children: "R",
  },
};

export default meta;
type Story = StoryObj<typeof Kbd>;

export const Default: Story = {};

export const V1Shape: Story = {
  play: async ({ canvasElement }) => {
    const style = getComputedStyle(canvasElement.querySelector("kbd")!);
    await expect(style.fontSize).toBe("12px");
    await expect(style.fontWeight).toBe("500");
    await expect(style.borderRadius).toBe("4px");
    await expect(style.borderColor).toBe("rgb(214, 211, 209)");
    await expect(style.color).toBe("rgb(87, 83, 78)");
    await expect(style.fontStretch).toBe("100%");
  },
};
