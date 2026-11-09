import { expect } from "storybook/test";

export async function expectNoCaps(root: HTMLElement) {
  const offenders = [root, ...root.querySelectorAll<HTMLElement>("*")]
    .map((el) => {
      const style = getComputedStyle(el);
      return {
        text: el.textContent?.trim().slice(0, 30) ?? "",
        transform: style.textTransform,
        spacing: style.letterSpacing,
      };
    })
    .filter((s) => s.transform === "uppercase" || s.spacing !== "normal");
  await expect(offenders).toEqual([]);
}
