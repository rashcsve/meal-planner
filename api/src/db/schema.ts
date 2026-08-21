import {
  boolean,
  check,
  index,
  integer,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { MEAL_TYPES, PROTEIN_SOURCES, DIET_TYPES, BASE_UNITS } from 'shared'

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
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    check('recipes_meal_check', sql`${table.meal} IN (${sqlInList(MEAL_TYPES)})`),
    check('recipes_protein_source_check', sql`${table.proteinSource} IN (${sqlInList(PROTEIN_SOURCES)})`),
    check('recipes_diet_check', sql`${table.diet} IN (${sqlInList(DIET_TYPES)})`),
  ],
)

export const ingredients = pgTable(
  'ingredients',
  {
    id: serial('id').primaryKey(),
    name: text('name').notNull().unique(),
    baseUnit: text('base_unit').notNull(),
    kcalPer100g: numeric('kcal_per_100g', { mode: 'number' }),
    proteinPer100g: numeric('protein_per_100g', { mode: 'number' }),
    carbsPer100g: numeric('carbs_per_100g', { mode: 'number' }),
    fatPer100g: numeric('fat_per_100g', { mode: 'number' }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [check('ingredients_base_unit_check', sql`${table.baseUnit} IN (${sqlInList(BASE_UNITS)})`)],
)

export const recipeIngredients = pgTable(
  'recipe_ingredients',
  {
    id: serial('id').primaryKey(),
    recipeId: integer('recipe_id')
      .notNull()
      .references(() => recipes.id, { onDelete: 'cascade' }),
    ingredientId: integer('ingredient_id')
      .notNull()
      .references(() => ingredients.id, { onDelete: 'restrict' }),
    amountBase: numeric('amount_base', { mode: 'number' }),
    displayAmount: numeric('display_amount', { mode: 'number' }),
    displayUnit: text('display_unit'),
    isOptional: boolean('is_optional').notNull().default(false),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    index('recipe_ingredients_recipe_id_idx').on(table.recipeId),
    index('recipe_ingredients_ingredient_id_idx').on(table.ingredientId),
  ],
)

export const unitConversions = pgTable(
  'unit_conversions',
  {
    id: serial('id').primaryKey(),
    fromUnit: text('from_unit').notNull(),
    factor: numeric('factor', { mode: 'number' }).notNull(),
    toBaseUnit: text('to_base_unit').notNull(),
    ingredientId: integer('ingredient_id').references(() => ingredients.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    check('unit_conversions_to_base_unit_check', sql`${table.toBaseUnit} IN (${sqlInList(BASE_UNITS)})`),
    uniqueIndex('unit_conversions_from_unit_ingredient_id_idx').on(table.fromUnit, table.ingredientId),
    uniqueIndex('unit_conversions_universal_from_unit_idx')
      .on(table.fromUnit)
      .where(sql`${table.ingredientId} IS NULL`),
    index('unit_conversions_ingredient_id_idx').on(table.ingredientId),
  ],
)
