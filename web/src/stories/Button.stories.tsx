import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { Button } from "../shared/ui/Button";

const meta: Meta<typeof Button> = {
  title: "shared/ui/Button",
  component: Button,
  args: {
    children: "Regenerate",
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

async function expectControlShape(button: HTMLElement) {
  const style = getComputedStyle(button);
  await expect(button.getBoundingClientRect().height).toBe(44);
  await expect(style.borderRadius).toBe("6px");
  await expect(style.fontSize).toBe("14px");
  await expect(style.fontWeight).toBe("500");
}

export const Primary: Story = {
  args: { variant: "primary" },
  play: async ({ canvasElement }) => {
    const button = within(canvasElement).getByRole("button", { name: "Regenerate" });
    const style = getComputedStyle(button);
    await expectControlShape(button);
    await expect(style.backgroundColor).toBe("rgb(24, 24, 27)");
    await expect(style.color).toBe("rgb(255, 255, 255)");
  },
};

export const Secondary: Story = {
  args: { variant: "secondary", children: "Unlock all" },
  play: async ({ canvasElement }) => {
    const button = within(canvasElement).getByRole("button", { name: "Unlock all" });
    const style = getComputedStyle(button);
    await expectControlShape(button);
    await expect(style.backgroundColor).toBe("rgb(255, 255, 255)");
    await expect(style.color).toBe("rgb(24, 24, 27)");
    await expect(style.borderTopColor).toBe("rgb(214, 211, 209)");
  },
};

export const Destructive: Story = {
  args: { variant: "destructive", children: "Delete" },
  play: async ({ canvasElement }) => {
    const button = within(canvasElement).getByRole("button", { name: "Delete" });
    const style = getComputedStyle(button);
    await expectControlShape(button);
    await expect(style.backgroundColor).toBe("rgb(255, 255, 255)");
    await expect(style.color).toBe("rgb(180, 35, 24)");
    await expect(style.borderTopColor).toBe("rgb(254, 243, 242)");
  },
};

export const Focused: Story = {
  args: { variant: "secondary", children: "Swap" },
  play: async ({ canvasElement }) => {
    const button = within(canvasElement).getByRole("button", { name: "Swap" });
    await userEvent.tab();
    await expect(button).toHaveFocus();
    const style = getComputedStyle(button);
    await expect(style.outlineStyle).toBe("solid");
    await expect(style.outlineWidth).toBe("2px");
    await expect(style.outlineColor).toBe("rgb(31, 63, 143)");
  },
};

export const Disabled: Story = { args: { disabled: true, children: "Save" } };
