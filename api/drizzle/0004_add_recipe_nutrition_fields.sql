ALTER TABLE "recipes" RENAME COLUMN "protein" TO "protein_source";
ALTER TABLE "recipes" DROP COLUMN "kcal";
ALTER TABLE "recipes" ADD COLUMN "description" text;
ALTER TABLE "recipes" ADD COLUMN "weight_g" numeric;
ALTER TABLE "recipes" ADD COLUMN "servings" integer;
ALTER TABLE "recipes" ADD COLUMN "kcal_per_100g" numeric;
ALTER TABLE "recipes" ADD COLUMN "protein_per_100g" numeric;
ALTER TABLE "recipes" ADD COLUMN "carbs_per_100g" numeric;
ALTER TABLE "recipes" ADD COLUMN "fat_per_100g" numeric;
