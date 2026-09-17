import { z } from "zod";

export const updateHouseholdSettingsSchema = z.object({
  weeklyBudgetCzk: z
    .number({ error: "Weekly budget must be a number" })
    .nonnegative("Weekly budget must be zero or more"),
  startDayOfWeek: z
    .number({ error: "Start day of week must be a number" })
    .int("Start day of week must be a whole number")
    .min(0, "Start day of week must be between 0 and 6")
    .max(6, "Start day of week must be between 0 and 6"),
  timezone: z.string({ error: "Timezone is required" }).min(1, "Timezone is required"),
});

export type UpdateHouseholdSettingsInput = z.infer<typeof updateHouseholdSettingsSchema>;

export const updateMemberDinnerTargetSchema = z.object({
  dinnerCalorieTarget: z
    .number({ error: "Dinner calorie target must be a number" })
    .positive("Dinner calorie target must be greater than 0"),
});

export type UpdateMemberDinnerTargetInput = z.infer<typeof updateMemberDinnerTargetSchema>;
