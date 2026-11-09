import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";

const roles = [
  { className: "type-page-title", text: "Page title", size: "24px", weight: "600" },
  { className: "type-stat", text: "1,840", size: "28px", weight: "600" },
  { className: "type-section", text: "Section title", size: "16px", weight: "600" },
  { className: "type-body", text: "Body text", size: "14px", weight: "400" },
  { className: "type-small", text: "Small text", size: "13px", weight: "400" },
  { className: "type-label", text: "Label", size: "12px", weight: "500" },
];

const meta: Meta = {
  title: "shared/Typography",
  render: () => (
    <div>
      {roles.map((role) => (
        <p key={role.className} className={role.className}>
          {role.text}
        </p>
      ))}
    </div>
  ),
};

export default meta;
type Story = StoryObj;

export const Base: Story = {
  play: async () => {
    const body = getComputedStyle(document.body);
    await expect(body.fontFamily).toMatch(/^"?Inter"?/);
    await expect(body.fontSize).toBe("14px");
  },
};

export const Roles: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    for (const role of roles) {
      const style = getComputedStyle(canvas.getByText(role.text));
      await expect({
        role: role.className,
        size: style.fontSize,
        weight: style.fontWeight,
      }).toEqual({
        role: role.className,
        size: role.size,
        weight: role.weight,
      });
    }
  },
};
