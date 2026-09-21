ALTER TABLE "ingredients" DROP CONSTRAINT "ingredients_name_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "ingredients_name_lower_idx" ON "ingredients" USING btree (lower("name"));