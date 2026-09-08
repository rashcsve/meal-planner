CREATE TABLE "household_settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"weekly_budget_czk" numeric NOT NULL,
	"start_day_of_week" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "household_settings_singleton_check" CHECK ("household_settings"."id" = 1),
	CONSTRAINT "household_settings_start_day_of_week_check" CHECK ("household_settings"."start_day_of_week" BETWEEN 0 AND 6)
);
