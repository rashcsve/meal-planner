CREATE TABLE "ingredient_preferences" (
	"id" serial PRIMARY KEY NOT NULL,
	"ingredient_id" integer NOT NULL,
	"rule" text NOT NULL,
	"member_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ingredient_preferences_rule_check" CHECK ("ingredient_preferences"."rule" IN ('never', 'dislike'))
);
--> statement-breakpoint
ALTER TABLE "ingredient_preferences" ADD CONSTRAINT "ingredient_preferences_ingredient_id_ingredients_id_fk" FOREIGN KEY ("ingredient_id") REFERENCES "public"."ingredients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingredient_preferences" ADD CONSTRAINT "ingredient_preferences_member_id_household_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."household_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ingredient_preferences_ingredient_member_idx" ON "ingredient_preferences" USING btree ("ingredient_id","member_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ingredient_preferences_household_idx" ON "ingredient_preferences" USING btree ("ingredient_id") WHERE "ingredient_preferences"."member_id" IS NULL;--> statement-breakpoint
CREATE INDEX "ingredient_preferences_member_id_idx" ON "ingredient_preferences" USING btree ("member_id");