import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { updateRecipeServingsSchema, type UpdateRecipeServingsInput } from "shared";
import { Button } from "../../shared/ui/Button";
import { Input } from "../../shared/ui/Input";

interface ServingsFieldProps {
  servings: number | null;
  onSave: (servings: number) => void;
  isSaving: boolean;
  error?: string;
}

export function ServingsField({ servings, onSave, isSaving, error }: ServingsFieldProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UpdateRecipeServingsInput>({
    resolver: zodResolver(updateRecipeServingsSchema),
    defaultValues: { servings: servings ?? undefined },
  });
  const message = errors.servings?.message ?? error;
  const errorId = message ? "servings-error" : undefined;

  return (
    <form onSubmit={handleSubmit((data) => onSave(data.servings))} className="flex flex-col gap-1">
      <label className="type-label text-9 text-faint" htmlFor="servings-input">
        Servings
      </label>
      <div className="flex items-center gap-1.5">
        <Input
          id="servings-input"
          type="number"
          className="w-14"
          aria-invalid={message ? true : undefined}
          aria-describedby={errorId}
          {...register("servings", { valueAsNumber: true })}
        />
        <Button type="submit" variant="ghost" disabled={isSaving}>
          Save
        </Button>
      </div>
      {message && (
        <p id={errorId} className="text-10 text-promo">
          {message}
        </p>
      )}
    </form>
  );
}
