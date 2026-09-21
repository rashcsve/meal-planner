import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { recipeIngredientLineSchema, type RecipeIngredientLineInput } from "shared";
import { Input } from "../../shared/ui/Input";
import { Button } from "../../shared/ui/Button";
import { CloseButton } from "../../shared/ui/CloseButton";
import { ErrorState } from "../../shared/ui/ErrorState";
import { rowStateShadow } from "../../shared/ui/Table";
import { cx } from "../../shared/lib/cx";
import type { RecipeIngredient } from "./useRecipes";

interface IngredientLineRowProps {
  line: RecipeIngredient;
  onSave: (data: RecipeIngredientLineInput) => void;
  isSaving: boolean;
  onRemove: () => void;
  isRemoving: boolean;
  error?: string;
}

export function IngredientLineRow({
  line,
  onSave,
  isSaving,
  onRemove,
  isRemoving,
  error,
}: IngredientLineRowProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RecipeIngredientLineInput>({
    resolver: zodResolver(recipeIngredientLineSchema),
    defaultValues: {
      ingredientId: line.ingredientId,
      amountBase: line.amountBase ?? undefined,
      displayAmount: line.displayAmount ?? undefined,
      displayUnit: line.displayUnit ?? undefined,
      isOptional: line.isOptional,
    },
  });
  const fieldId = `line-${line.id}`;
  const message = errors.displayUnit?.message ?? errors.displayAmount?.message ?? error;
  const errorId = message ? `${fieldId}-error` : undefined;

  return (
    <li className={cx("pl-1.5", line.amountBase == null && rowStateShadow.check)}>
      <form
        onSubmit={handleSubmit((data) =>
          onSave({
            ...data,
            ingredientId: line.ingredientId,
            amountBase: line.amountBase ?? undefined,
          }),
        )}
        className="flex flex-wrap items-center gap-1.5 text-11"
      >
        <span className="flex-1">{line.ingredientName}</span>
        <label className="sr-only" htmlFor={`${fieldId}-amount`}>
          Amount for {line.ingredientName}
        </label>
        <Input
          id={`${fieldId}-amount`}
          type="number"
          className="w-14"
          aria-invalid={message ? true : undefined}
          aria-describedby={errorId}
          {...register("displayAmount", {
            setValueAs: (v) => (v === "" ? undefined : Number(v)),
          })}
        />
        <label className="sr-only" htmlFor={`${fieldId}-unit`}>
          Unit for {line.ingredientName}
        </label>
        <Input
          id={`${fieldId}-unit`}
          className="w-16"
          aria-invalid={message ? true : undefined}
          aria-describedby={errorId}
          {...register("displayUnit", { setValueAs: (v) => (v === "" ? undefined : v) })}
        />
        <label className="inline-flex items-center gap-1 text-9 text-faint">
          <input type="checkbox" {...register("isOptional")} />
          optional
        </label>
        <Button type="submit" variant="ghost" disabled={isSaving}>
          Save
        </Button>
        <CloseButton
          aria-label={`Remove ${line.ingredientName}`}
          disabled={isRemoving}
          onClick={onRemove}
        />
      </form>
      {message && <ErrorState id={errorId} title="Couldn't save ingredient" message={message} />}
    </li>
  );
}
