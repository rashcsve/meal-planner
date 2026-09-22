import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import { ServingsField } from "../features/recipes/ServingsField";

const meta: Meta<typeof ServingsField> = {
  title: "features/recipes/ServingsField",
  component: ServingsField,
  args: {
    servings: 4,
    onSave: () => {},
    isSaving: false,
  },
};

export default meta;
type Story = StoryObj<typeof ServingsField>;

export const Default: Story = {};

export const Saving: Story = { args: { isSaving: true } };

export const SaveFailed: Story = {
  args: { error: "Servings must be greater than 0" },
};

export const SubmitsEditedValue: Story = {
  args: { onSave: fn() },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.clear(canvas.getByLabelText("Servings"));
    await userEvent.type(canvas.getByLabelText("Servings"), "6");
    await userEvent.click(canvas.getByRole("button", { name: "Save" }));

    await expect(args.onSave).toHaveBeenCalledWith(6);
  },
};
