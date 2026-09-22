ALTER TABLE "household_members" ADD COLUMN "confirmed_share" numeric;--> statement-breakpoint
ALTER TABLE "household_members" ADD COLUMN "share_confirmed_at" timestamp;--> statement-breakpoint
ALTER TABLE "household_settings" ADD COLUMN "standard_portion_target_kcal" numeric;--> statement-breakpoint
ALTER TABLE "household_settings" ADD COLUMN "standard_portion_confirmed_at" timestamp;--> statement-breakpoint
ALTER TABLE "household_members" ADD CONSTRAINT "household_members_confirmed_share_check" CHECK ("household_members"."confirmed_share" IS NULL OR ("household_members"."confirmed_share" BETWEEN 0.25 AND 4));--> statement-breakpoint
ALTER TABLE "household_settings" ADD CONSTRAINT "household_settings_standard_portion_target_kcal_check" CHECK ("household_settings"."standard_portion_target_kcal" IS NULL OR "household_settings"."standard_portion_target_kcal" > 0);