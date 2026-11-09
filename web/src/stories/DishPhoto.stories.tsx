import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, waitFor, within } from "storybook/test";
import { DishPhoto } from "../shared/ui/DishPhoto";
import { expectNoCaps } from "./expectNoCaps";

const photo =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

const meta: Meta<typeof DishPhoto> = {
  title: "shared/ui/DishPhoto",
  component: DishPhoto,
  args: { name: "Spinach omelette" },
  decorators: [
    (Story) => (
      <div data-testid="frame" style={{ width: 240, height: 140 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof DishPhoto>;

async function expectFillsFrame(canvasElement: HTMLElement, el: HTMLElement) {
  const frame = within(canvasElement).getByTestId("frame").getBoundingClientRect();
  const box = el.getBoundingClientRect();
  await expect(box.width).toBe(frame.width);
  await expect(box.height).toBe(frame.height);
}

export const WithPhoto: Story = {
  args: { photoUrl: photo },
  play: async ({ canvasElement }) => {
    const img = within(canvasElement).getByRole<HTMLImageElement>("img", {
      name: "Spinach omelette",
    });
    await expect(img.getAttribute("src")).toBe(photo);
    await waitFor(() => expect(img.naturalWidth).toBeGreaterThan(0));
    const style = getComputedStyle(img);
    await expect(style.objectFit).toBe("cover");
    await expect(style.borderRadius).toBe("8px");
    await expectFillsFrame(canvasElement, img);
  },
};

export const NoPhoto: Story = {
  args: { photoUrl: null },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvasElement.querySelector("img")).toBeNull();
    const tile = canvas.getByText("Spinach omelette").closest<HTMLElement>("[data-dish-tile]");
    await expect(tile).not.toBeNull();
    const style = getComputedStyle(tile!);
    await expect(style.backgroundColor).toBe("rgb(245, 245, 244)");
    await expect(style.borderRadius).toBe("8px");
    await expect(style.color).toBe("rgb(24, 24, 27)");
    await expectFillsFrame(canvasElement, tile!);
    await expectNoCaps(canvasElement);
  },
};

export const NoPhotoLongName: Story = {
  args: { name: "Mushroom sauce with potato dumplings and a cucumber salad on the side" },
  play: async ({ canvasElement }) => {
    const tile = canvasElement.querySelector<HTMLElement>("[data-dish-tile]");
    await expect(tile).not.toBeNull();
    await expect(tile!.scrollWidth).toBeLessThanOrEqual(tile!.clientWidth);
    await expect(tile!.scrollHeight).toBeLessThanOrEqual(tile!.clientHeight);
  },
};
