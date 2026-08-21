import { check, integer, numeric, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { MEAL_TYPES, PROTEIN_SOURCES, DIET_TYPES } from 'shared'

function sqlInList(values: readonly string[]) {
  return sql.raw(values.map((v) => `'${v.replace(/'/g, "''")}'`).join(', '))
}

export const recipes = pgTable(
  'recipes',
  {
    id: serial('id').primaryKey(),
    title: text('title').notNull().unique(),
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
  },
  (table) => [
    check('recipes_meal_check', sql`${table.meal} IN (${sqlInList(MEAL_TYPES)})`),
    check('recipes_protein_source_check', sql`${table.proteinSource} IN (${sqlInList(PROTEIN_SOURCES)})`),
    check('recipes_diet_check', sql`${table.diet} IN (${sqlInList(DIET_TYPES)})`),
  ],
)
