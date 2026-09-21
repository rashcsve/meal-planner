import { DetailRail } from "../../shared/layout/DetailRail";
import { Skeleton } from "../../shared/ui/Skeleton";
import { ErrorState } from "../../shared/ui/ErrorState";
import { Pill } from "../../shared/ui/Pill";
import { Stat } from "../../shared/ui/Stat";
import { CloseButton } from "../../shared/ui/CloseButton";
import { rowStateShadow } from "../../shared/ui/Table";
import { cx } from "../../shared/lib/cx";
import { formatTime } from "../../shared/lib/formatTime";
import {
  useRecipe,
  useRemoveIngredientLine,
  type RecipeIngredient,
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

function ingredientLabel(line: RecipeIngredient): string {
  const amount =
    line.displayAmount != null
      ? [line.displayAmount, line.displayUnit].filter(Boolean).join(" ")
      : null;
  return [amount, line.ingredientName].filter(Boolean).join(" ");
}

export function RecipeDetail({ id, onClose }: RecipeDetailProps) {
  const { data: recipe, isLoading, error } = useRecipe(id);
  const removeLine = useRemoveIngredientLine();
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
                <Stat label="Servings" value={recipe.servings} />
              </div>
            </div>
          )}

          {recipe.ingredients.length > 0 && (
            <div className="border-t border-hair pt-2.5">
              <span className="type-label text-9 text-faint">Ingredients</span>
              <ul className="mt-1.5 flex flex-col gap-1">
                {recipe.ingredients.map((line) => (
                  <li
                    key={line.id}
                    className={cx(
                      "flex items-center gap-1.5 pl-1.5 text-11",
                      line.amountBase == null && rowStateShadow.check,
                    )}
                  >
                    <span className="flex-1">{ingredientLabel(line)}</span>
                    <CloseButton
                      aria-label={`Remove ${line.ingredientName}`}
                      disabled={removeLine.isPending && removeLine.variables?.lineId === line.id}
                      onClick={() => removeLine.mutate({ recipeId: id, lineId: line.id })}
                    />
                  </li>
                ))}
              </ul>
              {removeLine.isError && (
                <ErrorState title="Couldn't remove ingredient" message={removeLine.error.message} />
              )}
            </div>
          )}

          {recipe.source && (
            <p className="border-t border-hair pt-2 text-10 text-faint">Source: {recipe.source}</p>
          )}
        </div>
      )}
    </DetailRail>
  );
}
