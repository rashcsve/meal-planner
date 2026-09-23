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
  timezone: z
    .string({ error: "Timezone is required" })
    .min(1, "Timezone is required")
    .refine(
      (value) => Intl.supportedValuesOf("timeZone").includes(value),
      "Timezone must be a valid IANA time zone name",
    ),
});

export type UpdateHouseholdSettingsInput = z.infer<typeof updateHouseholdSettingsSchema>;

export const updateMemberDinnerTargetSchema = z.object({
  dinnerCalorieTarget: z
    .number({ error: "Dinner calorie target must be a number" })
    .positive("Dinner calorie target must be greater than 0"),
});

export type UpdateMemberDinnerTargetInput = z.infer<typeof updateMemberDinnerTargetSchema>;

export const confirmHouseholdSharesSchema = z.object({
  targetKcal: z
    .number({ error: "Standard portion target must be a number" })
    .positive("Standard portion target must be greater than 0"),
  shares: z
    .array(
      z.object({
        memberId: z.number().int().positive(),
        share: z
          .number({ error: "Share must be a number" })
          .min(0.25, "Share must be at least 0.25")
          .max(4, "Share must be at most 4"),
      }),
    )
    .min(1, "At least one member share is required"),
});

export type ConfirmHouseholdSharesInput = z.infer<typeof confirmHouseholdSharesSchema>;
