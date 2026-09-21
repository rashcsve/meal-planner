import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import { AddIngredientLineForm } from "../features/recipes/AddIngredientLineForm";
import type { Ingredient } from "../features/recipes/useIngredients";

function ingredient(id: number, name: string, baseUnit: string): Ingredient {
  return {
    id,
    name,
    baseUnit,
    kcalPer100g: null,
    proteinPer100g: null,
    carbsPer100g: null,
    fatPer100g: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

const ingredients: Ingredient[] = [ingredient(1, "Olive oil", "ml"), ingredient(2, "Rice", "g")];

const meta: Meta<typeof AddIngredientLineForm> = {
  title: "features/recipes/AddIngredientLineForm",
  component: AddIngredientLineForm,
  decorators: [(Story) => <ul>{Story()}</ul>],
  args: {
    ingredients,
    onAdd: async () => {},
    onCreateIngredient: async () => ingredient(99, "Cinnamon", "g"),
    isAdding: false,
    isCreating: false,
  },
};

export default meta;
type Story = StoryObj<typeof AddIngredientLineForm>;

export const Default: Story = {};

export const Adding: Story = { args: { isAdding: true } };

export const AddFailed: Story = {
  args: { error: "Ingredient is required" },
};

export const SubmitsSelectedIngredient: Story = {
  args: { onAdd: fn(async () => {}) },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.selectOptions(canvas.getByLabelText("New ingredient"), "2");
    await userEvent.type(canvas.getByLabelText("Amount"), "150");
    await userEvent.type(canvas.getByLabelText("Unit"), "g");
    await userEvent.click(canvas.getByRole("button", { name: "Add" }));

    await expect(args.onAdd).toHaveBeenCalledWith({
      ingredientId: 2,
      displayAmount: 150,
      displayUnit: "g",
      isOptional: false,
    });
    await expect(canvas.getByLabelText("Amount")).toHaveValue(null);
    await expect(canvas.getByLabelText("Unit")).toHaveValue("");
    await expect(canvas.getByLabelText("New ingredient")).toHaveValue("2");
  },
};

export const CreatesNewIngredient: Story = {
  args: { onCreateIngredient: fn(async () => ingredient(99, "Cinnamon", "g")) },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "+ New ingredient" }));
    await userEvent.type(canvas.getByLabelText("New ingredient name"), "Cinnamon");
    await userEvent.click(canvas.getByRole("button", { name: "Create" }));

    await expect(args.onCreateIngredient).toHaveBeenCalledWith({
      name: "Cinnamon",
      baseUnit: "g",
    });
    await expect(canvas.getByRole("button", { name: "+ New ingredient" })).toBeInTheDocument();
    await expect(canvas.getByLabelText("New ingredient")).toHaveValue("99");
  },
};
