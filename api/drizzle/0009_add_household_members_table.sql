CREATE TABLE "household_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"daily_calorie_target" numeric NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "household_members_name_unique" UNIQUE("name")
);
