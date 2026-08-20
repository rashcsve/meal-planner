import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo } from "react";
import {
  createRecipeSchema,
  MEAL_TYPES,
  PROTEIN_SOURCES,
  DIET_TYPES,
  type CreateRecipeInput,
} from "shared";
import { Button } from "../../shared/ui/Button";
import { Input } from "../../shared/ui/Input";
import { Select } from "../../shared/ui/Select";
import { Textarea } from "../../shared/ui/Textarea";
import { FormField } from "../../shared/ui/FormField";
import { ErrorState } from "../../shared/ui/ErrorState";
import {
  emptyToUndefined,
  emptyToUndefinedNumber,
} from "../../shared/lib/formValues";
import { useCreateRecipe, useRecipes } from "./useRecipes";

interface RecipeFormProps {
  onSaved: () => void;
  onCancel: () => void;
}

export function RecipeForm({ onSaved, onCancel }: RecipeFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateRecipeInput>({
    resolver: zodResolver(createRecipeSchema),
  });
  const createRecipe = useCreateRecipe();
  const { data: recipes } = useRecipes();
  const cuisineSuggestions = useMemo(() => {
    const cuisines = (recipes ?? [])
      .map((r) => r.cuisine)
      .filter((c): c is string => Boolean(c));
    return [...new Set(cuisines)].sort();
  }, [recipes]);

  function onSubmit(data: CreateRecipeInput) {
    createRecipe.mutate(data, { onSuccess: onSaved });
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="rounded border border-line bg-card"
    >
      <div className="border-b border-line px-2.5 py-1.75">
        <span className="type-label text-9 text-faint">New recipe</span>
      </div>
      <div className="grid grid-cols-[130px_1fr] items-center gap-x-3 gap-y-2 p-2.5">
        <FormField id="title" label="Title" error={errors.title?.message}>
          <Input id="title" {...register("title")} />
        </FormField>

        <FormField
          id="description"
          label="Description"
          error={errors.description?.message}
        >
          <Textarea
            id="description"
            rows={3}
            {...register("description", { setValueAs: emptyToUndefined })}
          />
        </FormField>

        <FormField id="time" label="Time (min)" error={errors.time?.message}>
          <Input
            id="time"
            type="number"
            {...register("time", { valueAsNumber: true })}
          />
        </FormField>

        <FormField id="meal" label="Meal" error={errors.meal?.message}>
          <Select
            id="meal"
            {...register("meal", { setValueAs: emptyToUndefined })}
          >
            <option value="">Select meal type</option>
            {MEAL_TYPES.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField id="cuisine" label="Cuisine" error={errors.cuisine?.message}>
          <Input
            id="cuisine"
            list="cuisine-suggestions"
            {...register("cuisine", { setValueAs: emptyToUndefined })}
          />
        </FormField>

        <FormField
          id="proteinSource"
          label="Protein source"
          error={errors.proteinSource?.message}
        >
          <Select
            id="proteinSource"
            {...register("proteinSource", { setValueAs: emptyToUndefined })}
          >
            <option value="">Select protein source</option>
            {PROTEIN_SOURCES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField id="diet" label="Diet" error={errors.diet?.message}>
          <Select
            id="diet"
            {...register("diet", { setValueAs: emptyToUndefined })}
          >
            <option value="">Select diet</option>
            {DIET_TYPES.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField id="cost" label="Cost" error={errors.cost?.message}>
          <Input
            id="cost"
            type="number"
            {...register("cost", { setValueAs: emptyToUndefinedNumber })}
          />
        </FormField>

        <FormField id="source" label="Source" error={errors.source?.message}>
          <Input
            id="source"
            {...register("source", { setValueAs: emptyToUndefined })}
          />
        </FormField>

        <div className="col-span-2 mt-1 border-t border-hair pt-2">
          <span className="type-label text-9 text-faint">
            Nutrition, per 100g
          </span>
        </div>

        <FormField
          id="weightG"
          label="Result weight (g)"
          error={errors.weightG?.message}
        >
          <Input
            id="weightG"
            type="number"
            {...register("weightG", { setValueAs: emptyToUndefinedNumber })}
          />
        </FormField>

        <FormField id="servings" label="Servings" error={errors.servings?.message}>
          <Input
            id="servings"
            type="number"
            {...register("servings", { setValueAs: emptyToUndefinedNumber })}
          />
        </FormField>

        <FormField
          id="kcalPer100g"
          label="Kcal"
          error={errors.kcalPer100g?.message}
        >
          <Input
            id="kcalPer100g"
            type="number"
            {...register("kcalPer100g", {
              setValueAs: emptyToUndefinedNumber,
            })}
          />
        </FormField>

        <FormField
          id="proteinPer100g"
          label="Protein (g)"
          error={errors.proteinPer100g?.message}
        >
          <Input
            id="proteinPer100g"
            type="number"
            {...register("proteinPer100g", {
              setValueAs: emptyToUndefinedNumber,
            })}
          />
        </FormField>

        <FormField
          id="carbsPer100g"
          label="Carbs (g)"
          error={errors.carbsPer100g?.message}
        >
          <Input
            id="carbsPer100g"
            type="number"
            {...register("carbsPer100g", {
              setValueAs: emptyToUndefinedNumber,
            })}
          />
        </FormField>

        <FormField
          id="fatPer100g"
          label="Fat (g)"
          error={errors.fatPer100g?.message}
        >
          <Input
            id="fatPer100g"
            type="number"
            {...register("fatPer100g", { setValueAs: emptyToUndefinedNumber })}
          />
        </FormField>
      </div>

      <datalist id="cuisine-suggestions">
        {cuisineSuggestions.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>

      {createRecipe.isError && (
        <div className="px-2.5 pb-2.5">
          <ErrorState
            title="Couldn't save recipe"
            message={createRecipe.error.message}
          />
        </div>
      )}

      <div className="flex items-center gap-1.5 border-t border-line px-2.5 py-1.75">
        <Button type="submit" disabled={createRecipe.isPending}>
          Save recipe
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
