import { integer, numeric, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core'

export const recipes = pgTable('recipes', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  time: integer('time').notNull(),
  cost: numeric('cost', { mode: 'number' }),
  meal: text('meal'),
  cuisine: text('cuisine'),
  proteinSource: text('protein_source'),
  diet: text('diet'),
  source: text('source'),
  weightG: numeric('weight_g', { mode: 'number' }),
  servings: integer('servings'),
  kcalPer100g: numeric('kcal_per_100g', { mode: 'number' }),
  proteinPer100g: numeric('protein_per_100g', { mode: 'number' }),
  carbsPer100g: numeric('carbs_per_100g', { mode: 'number' }),
  fatPer100g: numeric('fat_per_100g', { mode: 'number' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})
