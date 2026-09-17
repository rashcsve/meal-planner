import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { updateMemberDinnerTargetSchema, type UpdateMemberDinnerTargetInput } from "shared";
import { Button } from "../../shared/ui/Button";
import { Input } from "../../shared/ui/Input";
import type { HouseholdMember } from "./useHousehold";

interface MemberTargetRowProps {
  member: HouseholdMember;
  onSave: (dinnerCalorieTarget: number) => void;
  isSaving: boolean;
  error?: string;
}

export function MemberTargetRow({ member, onSave, isSaving, error }: MemberTargetRowProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UpdateMemberDinnerTargetInput>({
    resolver: zodResolver(updateMemberDinnerTargetSchema),
    defaultValues: { dinnerCalorieTarget: member.dinnerCalorieTarget ?? undefined },
  });
  const fieldId = `dinner-target-${member.id}`;
  const message = errors.dinnerCalorieTarget?.message ?? error;
  const errorId = message ? `${fieldId}-error` : undefined;

  return (
    <form
      onSubmit={handleSubmit((data) => onSave(data.dinnerCalorieTarget))}
      className="flex flex-wrap items-center gap-2 border-b border-hair px-2.5 py-1.75 last:border-b-0"
    >
      <span className="type-name flex-1 text-11">{member.name}</span>
      <label className="sr-only" htmlFor={fieldId}>
        Dinner calorie target for {member.name}
      </label>
      <Input
        id={fieldId}
        type="number"
        className="w-20"
        aria-invalid={message ? true : undefined}
        aria-describedby={errorId}
        {...register("dinnerCalorieTarget", { valueAsNumber: true })}
      />
      <span className="type-label text-9 text-faint">kcal / dinner</span>
      <Button type="submit" variant="ghost" disabled={isSaving}>
        Save
      </Button>
      {message && (
        <p id={errorId} className="w-full text-10 text-promo">
          {message}
        </p>
      )}
    </form>
  );
}
