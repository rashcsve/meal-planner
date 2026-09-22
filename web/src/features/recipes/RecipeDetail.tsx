import { DetailRail } from "../../shared/layout/DetailRail";
import { Skeleton } from "../../shared/ui/Skeleton";
import { ErrorState } from "../../shared/ui/ErrorState";
import { Pill } from "../../shared/ui/Pill";
import { Stat } from "../../shared/ui/Stat";
import { formatTime } from "../../shared/lib/formatTime";
import { IngredientLineRow } from "./IngredientLineRow";
import { AddIngredientLineForm } from "./AddIngredientLineForm";
import { ServingsField } from "./ServingsField";
import { ArchiveRecipeControl } from "./ArchiveRecipeControl";
import { useCreateIngredient, useIngredients } from "./useIngredients";
import { firstMutationError, lineMutationError } from "./mutationError";
import {
  useAddIngredientLine,
  useArchiveRecipe,
  useEditIngredientLine,
  useEditRecipeServings,
  useRecipe,
  useRemoveIngredientLine,
  type RecipeWithIngredients,
} from "./useRecipes";

interface RecipeDetailProps {
  id: number;
  onClose: () => void;
}

function metaLine(recipe: RecipeWithIngredients): string {
  return [formatTime(recipe.time), recipe.meal, recipe.cost != null ? `${recipe.cost},-` : null]
    .filter((part): part is string => Boolean(part))
    .join(" · ");
}

export function RecipeDetail({ id, onClose }: RecipeDetailProps) {
  const { data: recipe, isLoading, error } = useRecipe(id);
  const editLine = useEditIngredientLine();
  const removeLine = useRemoveIngredientLine();
  const editServings = useEditRecipeServings();
  const {
    data: ingredients,
    error: ingredientsError,
    isLoading: ingredientsLoading,
  } = useIngredients();
  const addLine = useAddIngredientLine();
  const createIngredient = useCreateIngredient();
  const archiveRecipe = useArchiveRecipe();
  const tags = recipe
    ? [recipe.cuisine, recipe.proteinSource, recipe.diet].filter((tag): tag is string =>
        Boolean(tag),
      )
    : [];
  const hasPortionInfo = recipe?.weightG != null || recipe?.servings != null;

  return (
    <DetailRail label="Recipe" onClose={onClose}>
      {isLoading && (
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-5" />
          <Skeleton className="h-4" />
        </div>
      )}
      {error && <ErrorState title="Couldn't load recipe" message={error.message} />}
      {recipe && (
        <div className="flex flex-col gap-3">
          <div>
            <h3 className="type-name text-15">{recipe.title}</h3>
            <p className="mt-1 text-11 text-muted">{metaLine(recipe)}</p>
          </div>

          {recipe.description && (
            <p className="text-11 leading-normal text-muted">{recipe.description}</p>
          )}

          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {tags.map((tag) => (
                <Pill key={tag}>{tag}</Pill>
              ))}
            </div>
          )}

          {hasPortionInfo && (
            <div className="border-t border-hair pt-2.5">
              <span className="type-label text-9 text-faint">Portion</span>
              <div className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-2">
                <Stat label="Weight" value={recipe.weightG} unit="g" />
                <ServingsField
                  key={recipe.id}
                  servings={recipe.servings}
                  onSave={(servings) => editServings.mutate({ recipeId: id, data: { servings } })}
                  isSaving={editServings.isPending}
                  error={firstMutationError(editServings)}
                />
              </div>
            </div>
          )}

          <div className="border-t border-hair pt-2.5">
            <span className="type-label text-9 text-faint">Ingredients</span>
            <ul className="mt-1.5 flex flex-col gap-1">
              {recipe.ingredients.map((line) => (
                <IngredientLineRow
                  key={line.id}
                  line={line}
                  onSave={(data) => editLine.mutate({ recipeId: id, lineId: line.id, data })}
                  isSaving={editLine.isPending && editLine.variables?.lineId === line.id}
                  error={lineMutationError(line.id, editLine, removeLine)}
                  onRemove={() => removeLine.mutate({ recipeId: id, lineId: line.id })}
                  isRemoving={removeLine.isPending && removeLine.variables?.lineId === line.id}
                />
              ))}
              {ingredientsLoading && (
                <li className="pl-1.5">
                  <Skeleton className="h-6" />
                </li>
              )}
              {ingredientsError && (
                <li className="pl-1.5">
                  <ErrorState
                    title="Couldn't load ingredients"
                    message={ingredientsError.message}
                  />
                </li>
              )}
              {ingredients && (
                <AddIngredientLineForm
                  ingredients={ingredients}
                  onAdd={(data) => addLine.mutateAsync({ recipeId: id, data })}
                  onCreateIngredient={(data) => createIngredient.mutateAsync(data)}
                  isAdding={addLine.isPending}
                  isCreating={createIngredient.isPending}
                  error={firstMutationError(addLine, createIngredient)}
                />
              )}
            </ul>
          </div>

          {recipe.source && (
            <p className="border-t border-hair pt-2 text-10 text-faint">Source: {recipe.source}</p>
          )}

          <div className="border-t border-hair pt-2.5">
            <ArchiveRecipeControl
              key={recipe.id}
              onArchive={() => archiveRecipe.mutate(id, { onSuccess: onClose })}
              onCancel={() => archiveRecipe.reset()}
              isArchiving={archiveRecipe.isPending}
              error={firstMutationError(archiveRecipe)}
            />
          </div>
        </div>
      )}
    </DetailRail>
  );
}
