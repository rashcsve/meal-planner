CREATE TABLE "ingredients" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"base_unit" text NOT NULL,
	"kcal_per_100g" numeric,
	"protein_per_100g" numeric,
	"carbs_per_100g" numeric,
	"fat_per_100g" numeric,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ingredients_name_unique" UNIQUE("name"),
	CONSTRAINT "ingredients_base_unit_check" CHECK ("ingredients"."base_unit" IN ('g', 'ml', 'pcs'))
);
--> statement-breakpoint
CREATE TABLE "recipe_ingredients" (
	"id" serial PRIMARY KEY NOT NULL,
	"recipe_id" integer NOT NULL,
	"ingredient_id" integer NOT NULL,
	"amount_base" numeric,
	"display_amount" numeric,
	"display_unit" text,
	"is_optional" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "unit_conversions" (
	"id" serial PRIMARY KEY NOT NULL,
	"from_unit" text NOT NULL,
	"factor" numeric NOT NULL,
	"to_base_unit" text NOT NULL,
	"ingredient_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "unit_conversions_to_base_unit_check" CHECK ("unit_conversions"."to_base_unit" IN ('g', 'ml', 'pcs'))
);
--> statement-breakpoint
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_ingredient_id_ingredients_id_fk" FOREIGN KEY ("ingredient_id") REFERENCES "public"."ingredients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unit_conversions" ADD CONSTRAINT "unit_conversions_ingredient_id_ingredients_id_fk" FOREIGN KEY ("ingredient_id") REFERENCES "public"."ingredients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "recipe_ingredients_recipe_id_idx" ON "recipe_ingredients" USING btree ("recipe_id");--> statement-breakpoint
CREATE INDEX "recipe_ingredients_ingredient_id_idx" ON "recipe_ingredients" USING btree ("ingredient_id");--> statement-breakpoint
CREATE UNIQUE INDEX "unit_conversions_from_unit_ingredient_id_idx" ON "unit_conversions" USING btree ("from_unit","ingredient_id");--> statement-breakpoint
CREATE UNIQUE INDEX "unit_conversions_universal_from_unit_idx" ON "unit_conversions" USING btree ("from_unit") WHERE "unit_conversions"."ingredient_id" IS NULL;--> statement-breakpoint
CREATE INDEX "unit_conversions_ingredient_id_idx" ON "unit_conversions" USING btree ("ingredient_id");--> statement-breakpoint
ALTER TABLE "recipes" DROP COLUMN "kcal_per_100g";--> statement-breakpoint
ALTER TABLE "recipes" DROP COLUMN "protein_per_100g";--> statement-breakpoint
ALTER TABLE "recipes" DROP COLUMN "carbs_per_100g";--> statement-breakpoint
ALTER TABLE "recipes" DROP COLUMN "fat_per_100g";