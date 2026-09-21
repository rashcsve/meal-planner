import type { Meta, StoryObj } from "@storybook/react-vite";
import { IngredientLineRow } from "../features/recipes/IngredientLineRow";
import type { RecipeIngredient } from "../features/recipes/useRecipes";

const line: RecipeIngredient = {
  id: 1,
  ingredientId: 1,
  ingredientName: "Olive oil",
  displayAmount: 2,
  displayUnit: "lžíce",
  amountBase: 27.6,
  isOptional: false,
};

const meta: Meta<typeof IngredientLineRow> = {
  title: "features/recipes/IngredientLineRow",
  component: IngredientLineRow,
  decorators: [(Story) => <ul>{Story()}</ul>],
  args: {
    line,
    onSave: () => {},
    isSaving: false,
    onRemove: () => {},
    isRemoving: false,
  },
};

export default meta;
type Story = StoryObj<typeof IngredientLineRow>;

export const Default: Story = {};

export const UnknownAmount: Story = {
  args: { line: { ...line, displayAmount: null, displayUnit: null, amountBase: null } },
};

export const Optional: Story = {
  args: { line: { ...line, isOptional: true } },
};

export const Saving: Story = { args: { isSaving: true } };

export const SaveFailed: Story = {
  args: { error: "Display unit can't be blank" },
};
