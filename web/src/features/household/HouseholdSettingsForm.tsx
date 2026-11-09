import type { ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { updateHouseholdSettingsSchema, type UpdateHouseholdSettingsInput } from "shared";
import { Button } from "../../shared/ui/Button";
import { Input } from "../../shared/ui/Input";
import { Select } from "../../shared/ui/Select";
import { ErrorState } from "../../shared/ui/ErrorState";

const DAY_OPTIONS = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

interface HouseholdSettingsFormProps {
  defaultValues: Partial<UpdateHouseholdSettingsInput>;
  onSubmit: (data: UpdateHouseholdSettingsInput) => void;
  isSaving: boolean;
  error?: string;
}

export function HouseholdSettingsForm({
  defaultValues,
  onSubmit,
  isSaving,
  error,
}: HouseholdSettingsFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UpdateHouseholdSettingsInput>({
    resolver: zodResolver(updateHouseholdSettingsSchema),
    defaultValues,
  });

  const errorProps = (message?: string, id?: string) =>
    message ? { "aria-invalid": true, "aria-describedby": `${id}-error` } : {};

  return (
    <section
      aria-labelledby="rules-heading"
      className="flex flex-col gap-4 rounded-lg border border-divider bg-surface p-6"
    >
      <h2 id="rules-heading" className="type-section text-ink">
        Rules for the week
      </h2>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Field id="weeklyBudgetCzk" label="Weekly budget" error={errors.weeklyBudgetCzk?.message}>
          <div className="flex items-center gap-3">
            <Input
              id="weeklyBudgetCzk"
              type="number"
              className="w-24"
              {...errorProps(errors.weeklyBudgetCzk?.message, "weeklyBudgetCzk")}
              {...register("weeklyBudgetCzk", { valueAsNumber: true })}
            />
            <span className="type-small text-muted">Kč for seven dinners</span>
          </div>
        </Field>

        <Field id="startDayOfWeek" label="Week starts" error={errors.startDayOfWeek?.message}>
          <Select
            id="startDayOfWeek"
            {...errorProps(errors.startDayOfWeek?.message, "startDayOfWeek")}
            {...register("startDayOfWeek", { valueAsNumber: true })}
          >
            {DAY_OPTIONS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field id="timezone" label="Timezone" error={errors.timezone?.message}>
          <Input
            id="timezone"
            {...errorProps(errors.timezone?.message, "timezone")}
            {...register("timezone")}
          />
        </Field>

        <div className="flex flex-col gap-1">
          <span className="type-body font-semibold text-ink">Calorie tolerance</span>
          <span className="type-small text-muted">±10 %</span>
        </div>

        {error && <ErrorState title="Couldn't save settings" message={error} />}

        <Button type="submit" disabled={isSaving} className="self-start">
          Save rules
        </Button>
      </form>
    </section>
  );
}

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="type-body font-semibold text-ink">
        {label}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} className="type-small text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
