import { expect } from "storybook/test";

export const tones = {
  ok: { color: "rgb(45, 106, 79)", tint: "rgb(236, 253, 243)" },
  warning: { color: "rgb(181, 71, 8)", tint: "rgb(255, 250, 235)" },
  danger: { color: "rgb(180, 35, 24)", tint: "rgb(254, 243, 242)" },
  lock: { color: "rgb(31, 63, 143)", tint: "rgb(231, 233, 238)" },
} as const;

export async function expectTagShape(tag: HTMLElement, tone: keyof typeof tones) {
  const style = getComputedStyle(tag);
  await expect(style.fontSize).toBe("12px");
  await expect(style.fontWeight).toBe("600");
  await expect(style.borderRadius).toBe("4px");
  await expect(style.color).toBe(tones[tone].color);
  await expect(style.backgroundColor).toBe(tones[tone].tint);
}
