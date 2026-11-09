import { expect, userEvent } from "storybook/test";

export async function expectFieldShape(field: HTMLElement) {
  const style = getComputedStyle(field);
  await expect(field.getBoundingClientRect().height).toBe(44);
  await expect(style.borderRadius).toBe("6px");
  await expect(style.fontSize).toBe("14px");
  await expect(style.fontWeight).toBe("400");
  await expect(style.borderTopWidth).toBe("1px");
  await expect(style.borderTopColor).toBe("rgb(214, 211, 209)");
  await expect(style.backgroundColor).toBe("rgb(255, 255, 255)");
}

export async function expectLockFocusRing(field: HTMLElement) {
  await userEvent.tab();
  await expect(field).toHaveFocus();
  const style = getComputedStyle(field);
  await expect(style.outlineStyle).toBe("solid");
  await expect(style.outlineWidth).toBe("2px");
  await expect(style.outlineColor).toBe("rgb(31, 63, 143)");
}
