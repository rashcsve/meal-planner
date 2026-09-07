CREATE TABLE "ingredient_prices" (
	"id" serial PRIMARY KEY NOT NULL,
	"ingredient_id" integer NOT NULL,
	"store" text NOT NULL,
	"amount" numeric NOT NULL,
	"unit" text NOT NULL,
	"price" numeric NOT NULL,
	"valid_from" date NOT NULL,
	"valid_to" date,
	"is_promo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ingredient_prices" ADD CONSTRAINT "ingredient_prices_ingredient_id_ingredients_id_fk" FOREIGN KEY ("ingredient_id") REFERENCES "public"."ingredients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ingredient_prices_ingredient_validity_idx" ON "ingredient_prices" USING btree ("ingredient_id","valid_from","valid_to");