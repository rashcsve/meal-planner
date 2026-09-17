import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { updateHouseholdSettingsSchema, type UpdateHouseholdSettingsInput } from "shared";
import { Button } from "../../shared/ui/Button";
import { Input } from "../../shared/ui/Input";
import { Select } from "../../shared/ui/Select";
import { FormField } from "../../shared/ui/FormField";
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
  defaultValues: UpdateHouseholdSettingsInput;
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

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="rounded border border-line bg-card">
      <div className="border-b border-line px-2.5 py-1.75">
        <span className="type-label text-9 text-faint">Planning settings</span>
      </div>
      <div className="grid grid-cols-[150px_1fr] items-center gap-x-3 gap-y-2 p-2.5">
        <FormField
          id="weeklyBudgetCzk"
          label="Weekly budget"
          error={errors.weeklyBudgetCzk?.message}
        >
          <div className="flex items-center gap-1.5">
            <Input
              id="weeklyBudgetCzk"
              type="number"
              {...register("weeklyBudgetCzk", { valueAsNumber: true })}
            />
            <span className="type-label text-9 text-faint">CZK</span>
          </div>
        </FormField>

        <FormField id="startDayOfWeek" label="Week starts" error={errors.startDayOfWeek?.message}>
          <Select id="startDayOfWeek" {...register("startDayOfWeek", { valueAsNumber: true })}>
            {DAY_OPTIONS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField id="timezone" label="Timezone" error={errors.timezone?.message}>
          <Input id="timezone" {...register("timezone")} />
        </FormField>

        <span className="text-11 text-muted">Calorie tolerance</span>
        <span className="text-11 text-ink">±10% (fixed)</span>
      </div>

      {error && (
        <div className="px-2.5 pb-2.5">
          <ErrorState title="Couldn't save settings" message={error} />
        </div>
      )}

      <div className="flex items-center gap-1.5 border-t border-line px-2.5 py-1.75">
        <Button type="submit" disabled={isSaving}>
          Save settings
        </Button>
      </div>
    </form>
  );
}
