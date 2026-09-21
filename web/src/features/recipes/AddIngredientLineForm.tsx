import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  BASE_UNITS,
  recipeIngredientLineSchema,
  type CreateIngredientInput,
  type RecipeIngredientLineInput,
} from "shared";
import { Button } from "../../shared/ui/Button";
import { Input } from "../../shared/ui/Input";
import { Select } from "../../shared/ui/Select";
import { ErrorState } from "../../shared/ui/ErrorState";
import { emptyToUndefined, emptyToUndefinedNumber } from "../../shared/lib/formValues";
import type { Ingredient } from "./useIngredients";

interface AddIngredientLineFormProps {
  ingredients: Ingredient[];
  onAdd: (data: RecipeIngredientLineInput) => Promise<unknown>;
  onCreateIngredient: (
    newIngredient: Pick<CreateIngredientInput, "name" | "baseUnit">,
  ) => Promise<Ingredient>;
  isAdding: boolean;
  isCreating: boolean;
  error?: string;
}

export function AddIngredientLineForm({
  ingredients,
  onAdd,
  onCreateIngredient,
  isAdding,
  isCreating,
  error,
}: AddIngredientLineFormProps) {
  const [isNew, setIsNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newBaseUnit, setNewBaseUnit] = useState<(typeof BASE_UNITS)[number]>(BASE_UNITS[0]);
  const [justCreated, setJustCreated] = useState<Ingredient | null>(null);
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<RecipeIngredientLineInput>({
    resolver: zodResolver(recipeIngredientLineSchema),
    defaultValues: { ingredientId: ingredients[0]?.id },
  });
  const message = errors.displayUnit?.message ?? errors.displayAmount?.message ?? error;
  const errorId = message ? "new-line-error" : undefined;
  const options =
    justCreated && !ingredients.some((i) => i.id === justCreated.id)
      ? [...ingredients, justCreated]
      : ingredients;

  async function handleAdd(data: RecipeIngredientLineInput) {
    try {
      await onAdd(data);
      reset();
      setValue("ingredientId", data.ingredientId);
    } catch {
      return;
    }
  }

  async function handleCreate() {
    try {
      const ingredient = await onCreateIngredient({ name: newName, baseUnit: newBaseUnit });
      setJustCreated(ingredient);
      setValue("ingredientId", ingredient.id);
      setIsNew(false);
      setNewName("");
    } catch {
      return;
    }
  }

  return (
    <li className="pl-1.5">
      <form
        onSubmit={handleSubmit(handleAdd)}
        className="flex flex-wrap items-center gap-1.5 text-11"
      >
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setIsNew((v) => !v);
            setNewName("");
          }}
        >
          {isNew ? "Cancel" : "+ New ingredient"}
        </Button>
        {isNew ? (
          <>
            <label className="sr-only" htmlFor="new-ingredient-name">
              New ingredient name
            </label>
            <Input
              id="new-ingredient-name"
              className="flex-1"
              required
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <label className="sr-only" htmlFor="new-ingredient-base-unit">
              New ingredient base unit
            </label>
            <Select
              id="new-ingredient-base-unit"
              value={newBaseUnit}
              onChange={(e) => setNewBaseUnit(e.target.value as (typeof BASE_UNITS)[number])}
            >
              {BASE_UNITS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </Select>
            <Button
              type="button"
              variant="ghost"
              disabled={isCreating || newName.trim() === ""}
              onClick={handleCreate}
            >
              Create
            </Button>
          </>
        ) : (
          <>
            <label className="sr-only" htmlFor="new-line-ingredient">
              New ingredient
            </label>
            <Select
              id="new-line-ingredient"
              className="flex-1"
              {...register("ingredientId", { valueAsNumber: true })}
            >
              {options.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name} ({i.baseUnit})
                </option>
              ))}
            </Select>
          </>
        )}
        <label className="sr-only" htmlFor="new-line-amount">
          Amount
        </label>
        <Input
          id="new-line-amount"
          type="number"
          className="w-14"
          aria-invalid={message ? true : undefined}
          aria-describedby={errorId}
          {...register("displayAmount", { setValueAs: emptyToUndefinedNumber })}
        />
        <label className="sr-only" htmlFor="new-line-unit">
          Unit
        </label>
        <Input
          id="new-line-unit"
          className="w-16"
          aria-invalid={message ? true : undefined}
          aria-describedby={errorId}
          {...register("displayUnit", { setValueAs: emptyToUndefined })}
        />
        <label className="inline-flex items-center gap-1 text-9 text-faint">
          <input type="checkbox" {...register("isOptional")} />
          optional
        </label>
        <Button type="submit" variant="ghost" disabled={isAdding || isNew}>
          Add
        </Button>
      </form>
      {message && <ErrorState id={errorId} title="Couldn't add ingredient" message={message} />}
    </li>
  );
}
