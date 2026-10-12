ALTER TABLE "plan_weeks" ADD COLUMN "violations" jsonb;--> statement-breakpoint
ALTER TABLE "plan_weeks" ADD COLUMN "recipes_version_at" timestamp;--> statement-breakpoint
ALTER TABLE "plan_weeks" ADD COLUMN "targets_version_at" timestamp;--> statement-breakpoint
ALTER TABLE "plan_weeks" ADD COLUMN "exclusions_version_at" timestamp;