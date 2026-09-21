import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import type { RecipeIngredientLineInput } from "shared";
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

export const SubmitsMergedPayload: Story = {
  args: { onSave: fn() },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.clear(canvas.getByLabelText(`Amount for ${line.ingredientName}`));
    await userEvent.type(canvas.getByLabelText(`Amount for ${line.ingredientName}`), "5");
    await userEvent.click(canvas.getByText("optional"));
    await userEvent.click(canvas.getByRole("button", { name: "Save" }));

    await expect(args.onSave).toHaveBeenCalledWith({
      ingredientId: line.ingredientId,
      amountBase: line.amountBase,
      displayAmount: 5,
      displayUnit: line.displayUnit,
      isOptional: true,
    });
  },
};

function ExternalUpdateHarness({ onSave }: { onSave: (data: RecipeIngredientLineInput) => void }) {
  const [currentLine, setCurrentLine] = useState(line);
  return (
    <>
      <IngredientLineRow
        line={currentLine}
        onSave={onSave}
        isSaving={false}
        onRemove={() => {}}
        isRemoving={false}
      />
      <li>
        <button
          type="button"
          onClick={() => setCurrentLine({ ...line, ingredientId: 42, amountBase: 99 })}
        >
          simulate external update
        </button>
      </li>
    </>
  );
}

export const PreservesLatestValuesAfterExternalUpdate: Story = {
  args: { onSave: fn() },
  render: (args) => <ExternalUpdateHarness onSave={args.onSave} />,
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByText("simulate external update"));
    await userEvent.click(canvas.getByRole("button", { name: "Save" }));

    await expect(args.onSave).toHaveBeenCalledWith(
      expect.objectContaining({ ingredientId: 42, amountBase: 99 }),
    );
  },
};
