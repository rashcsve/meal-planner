CREATE TABLE "plan_slots" (
	"id" serial PRIMARY KEY NOT NULL,
	"plan_week_id" integer NOT NULL,
	"day" integer NOT NULL,
	"meal_slot" text NOT NULL,
	"recipe_id" integer,
	"locked" boolean DEFAULT false NOT NULL,
	"reasons" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "plan_slots_day_check" CHECK ("plan_slots"."day" BETWEEN 0 AND 6),
	CONSTRAINT "plan_slots_meal_slot_check" CHECK ("plan_slots"."meal_slot" IN ('breakfast', 'lunch', 'dinner', 'snack_or_dessert'))
);
--> statement-breakpoint
CREATE TABLE "plan_weeks" (
	"id" serial PRIMARY KEY NOT NULL,
	"week_start_date" date NOT NULL,
	"seed" integer NOT NULL,
	"planner_version" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "plan_weeks_week_start_date_unique" UNIQUE("week_start_date")
);
--> statement-breakpoint
ALTER TABLE "plan_slots" ADD CONSTRAINT "plan_slots_plan_week_id_plan_weeks_id_fk" FOREIGN KEY ("plan_week_id") REFERENCES "public"."plan_weeks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_slots" ADD CONSTRAINT "plan_slots_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "plan_slots_week_day_meal_slot_idx" ON "plan_slots" USING btree ("plan_week_id","day","meal_slot");