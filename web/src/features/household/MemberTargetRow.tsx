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
      className="flex flex-wrap items-center gap-3 rounded-lg border border-divider bg-surface p-4"
    >
      <span
        aria-hidden="true"
        className="flex size-11 shrink-0 items-center justify-center rounded-full bg-fill type-section text-ink"
      >
        {member.name.charAt(0).toUpperCase()}
      </span>
      <div className="flex flex-1 flex-col">
        <span className="type-body font-semibold text-ink">{member.name}</span>
        <span className="type-small text-muted">
          {member.dinnerCalorieTarget != null
            ? `about ${member.dinnerCalorieTarget} kcal at dinner`
            : "No dinner target yet"}
        </span>
      </div>
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
      <span className="type-small text-muted">kcal</span>
      <Button type="submit" variant="secondary" disabled={isSaving}>
        Save
      </Button>
      {message && (
        <p id={errorId} className="w-full type-small text-danger">
          {message}
        </p>
      )}
    </form>
  );
}
