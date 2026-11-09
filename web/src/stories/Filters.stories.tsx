import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, userEvent, within } from "storybook/test";
import { Filters } from "../shared/ui/Filters";

type FilterValue = "all" | "needsCheck" | "linked";

const meta: Meta = {
  title: "shared/ui/Filters",
};

export default meta;
type Story = StoryObj;

function DefaultStory() {
  const [value, setValue] = useState<FilterValue>("all");
  return (
    <Filters
      aria-label="Show"
      value={value}
      onChange={setValue}
      options={[
        { value: "all", label: "All" },
        { value: "needsCheck", label: "Needs check" },
        { value: "linked", label: "Linked" },
      ]}
    />
  );
}

export const Default: Story = {
  render: () => <DefaultStory />,
};

async function expectChipShape(chip: HTMLElement) {
  const style = getComputedStyle(chip);
  await expect(chip.getBoundingClientRect().height).toBe(44);
  await expect(style.borderRadius).toBe("6px");
  await expect(style.fontSize).toBe("14px");
  await expect(style.fontWeight).toBe("500");
  await expect(style.borderTopWidth).toBe("1px");
}

export const ChipShape: Story = {
  render: () => <DefaultStory />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const all = canvas.getByRole("button", { name: "All" });
    const linked = canvas.getByRole("button", { name: "Linked" });

    await expectChipShape(all);
    await expect(all).toHaveAttribute("aria-pressed", "true");
    await expect(getComputedStyle(all).backgroundColor).toBe("rgb(24, 24, 27)");
    await expect(getComputedStyle(all).color).toBe("rgb(255, 255, 255)");

    await expectChipShape(linked);
    await expect(linked).toHaveAttribute("aria-pressed", "false");
    await expect(getComputedStyle(linked).backgroundColor).toBe("rgb(255, 255, 255)");
    await expect(getComputedStyle(linked).color).toBe("rgb(24, 24, 27)");
    await expect(getComputedStyle(linked).borderTopColor).toBe("rgb(214, 211, 209)");

    await userEvent.click(linked);
    await expect(linked).toHaveAttribute("aria-pressed", "true");
    await expect(getComputedStyle(linked).backgroundColor).toBe("rgb(24, 24, 27)");
  },
};

export const ChipFocus: Story = {
  render: () => <DefaultStory />,
  play: async ({ canvasElement }) => {
    const all = within(canvasElement).getByRole("button", { name: "All" });
    await userEvent.tab();
    await expect(all).toHaveFocus();
    const style = getComputedStyle(all);
    await expect(style.outlineStyle).toBe("solid");
    await expect(style.outlineWidth).toBe("2px");
    await expect(style.outlineColor).toBe("rgb(31, 63, 143)");
  },
};

export const Wraps: Story = {
  render: () => (
    <div style={{ width: 200 }}>
      <DefaultStory />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const group = within(canvasElement).getByRole("group", { name: "Show" });
    await expect(group.scrollWidth).toBeLessThanOrEqual(group.clientWidth);
  },
};
