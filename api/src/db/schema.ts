import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import {
  MEAL_TYPES,
  PROTEIN_SOURCES,
  DIET_TYPES,
  BASE_UNITS,
  INGREDIENT_PREFERENCE_RULES,
  MEAL_SLOTS,
} from "shared";
import type { MemberServing } from "shared";

function sqlInList(values: readonly string[]) {
  return sql.raw(values.map((v) => `'${v.replace(/'/g, "''")}'`).join(", "));
}

export const recipes = pgTable(
  "recipes",
  {
    id: serial("id").primaryKey(),
    title: text("title").notNull().unique(),
    description: text("description"),
    time: integer("time").notNull(),
    cost: numeric("cost", { mode: "number" }),
    meal: text("meal"),
    cuisine: text("cuisine"),
    proteinSource: text("protein_source"),
    diet: text("diet"),
    source: text("source"),
    weightG: numeric("weight_g", { mode: "number" }),
    servings: integer("servings"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    check("recipes_meal_check", sql`${table.meal} IN (${sqlInList(MEAL_TYPES)})`),
    check(
      "recipes_protein_source_check",
      sql`${table.proteinSource} IN (${sqlInList(PROTEIN_SOURCES)})`,
    ),
    check("recipes_diet_check", sql`${table.diet} IN (${sqlInList(DIET_TYPES)})`),
  ],
);

export const ingredients = pgTable(
  "ingredients",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    baseUnit: text("base_unit").notNull(),
    kcalPer100g: numeric("kcal_per_100g", { mode: "number" }),
    proteinPer100g: numeric("protein_per_100g", { mode: "number" }),
    carbsPer100g: numeric("carbs_per_100g", { mode: "number" }),
    fatPer100g: numeric("fat_per_100g", { mode: "number" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    check("ingredients_base_unit_check", sql`${table.baseUnit} IN (${sqlInList(BASE_UNITS)})`),
    uniqueIndex("ingredients_name_lower_idx").on(sql`lower(${table.name})`),
  ],
);

export const recipeIngredients = pgTable(
  "recipe_ingredients",
  {
    id: serial("id").primaryKey(),
    recipeId: integer("recipe_id")
      .notNull()
      .references(() => recipes.id, { onDelete: "cascade" }),
    ingredientId: integer("ingredient_id")
      .notNull()
      .references(() => ingredients.id, { onDelete: "restrict" }),
    amountBase: numeric("amount_base", { mode: "number" }),
    displayAmount: numeric("display_amount", { mode: "number" }),
    displayUnit: text("display_unit"),
    isOptional: boolean("is_optional").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("recipe_ingredients_recipe_id_idx").on(table.recipeId),
    index("recipe_ingredients_ingredient_id_idx").on(table.ingredientId),
  ],
);

export const pantryItems = pgTable(
  "pantry_items",
  {
    id: serial("id").primaryKey(),
    ingredientId: integer("ingredient_id")
      .notNull()
      .references(() => ingredients.id, { onDelete: "restrict" }),
    amountBase: numeric("amount_base", { mode: "number" }).notNull(),
    displayAmount: numeric("display_amount", { mode: "number" }),
    displayUnit: text("display_unit"),
    expiresOn: date("expires_on"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [index("pantry_items_ingredient_id_idx").on(table.ingredientId)],
);

export const householdMembers = pgTable(
  "household_members",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull().unique(),
    dailyCalorieTarget: numeric("daily_calorie_target", {
      mode: "number",
    }).notNull(),
    dinnerCalorieTarget: numeric("dinner_calorie_target", { mode: "number" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    check(
      "household_members_dinner_calorie_target_check",
      sql`${table.dinnerCalorieTarget} IS NULL OR ${table.dinnerCalorieTarget} > 0`,
    ),
  ],
);

export const householdSettings = pgTable(
  "household_settings",
  {
    id: integer("id").primaryKey().default(1),
    weeklyBudgetCzk: numeric("weekly_budget_czk", { mode: "number" }).notNull(),
    startDayOfWeek: integer("start_day_of_week").notNull(),
    timezone: text("timezone").notNull().default("Europe/Prague"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    check("household_settings_singleton_check", sql`${table.id} = 1`),
    check(
      "household_settings_start_day_of_week_check",
      sql`${table.startDayOfWeek} BETWEEN 0 AND 6`,
    ),
    check("household_settings_weekly_budget_czk_check", sql`${table.weeklyBudgetCzk} >= 0`),
  ],
);

export const ingredientPreferences = pgTable(
  "ingredient_preferences",
  {
    id: serial("id").primaryKey(),
    ingredientId: integer("ingredient_id")
      .notNull()
      .references(() => ingredients.id, { onDelete: "cascade" }),
    rule: text("rule").notNull(),
    memberId: integer("member_id").references(() => householdMembers.id, {
      onDelete: "cascade",
    }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    check(
      "ingredient_preferences_rule_check",
      sql`${table.rule} IN (${sqlInList(INGREDIENT_PREFERENCE_RULES)})`,
    ),
    uniqueIndex("ingredient_preferences_ingredient_member_idx").on(
      table.ingredientId,
      table.memberId,
    ),
    uniqueIndex("ingredient_preferences_household_idx")
      .on(table.ingredientId)
      .where(sql`${table.memberId} IS NULL`),
    index("ingredient_preferences_member_id_idx").on(table.memberId),
  ],
);

export const ingredientPrices = pgTable(
  "ingredient_prices",
  {
    id: serial("id").primaryKey(),
    ingredientId: integer("ingredient_id")
      .notNull()
      .references(() => ingredients.id, { onDelete: "cascade" }),
    store: text("store").notNull(),
    amount: numeric("amount", { mode: "number" }).notNull(),
    unit: text("unit").notNull(),
    price: numeric("price", { mode: "number" }).notNull(),
    validFrom: date("valid_from").notNull(),
    validTo: date("valid_to"),
    isPromo: boolean("is_promo").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("ingredient_prices_ingredient_validity_idx").on(
      table.ingredientId,
      table.validFrom,
      table.validTo,
    ),
  ],
);

export const planWeeks = pgTable("plan_weeks", {
  id: serial("id").primaryKey(),
  weekStartDate: date("week_start_date").notNull().unique(),
  seed: integer("seed").notNull(),
  plannerVersion: text("planner_version").notNull(),
  revision: integer("revision").notNull().default(1),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const planSlots = pgTable(
  "plan_slots",
  {
    id: serial("id").primaryKey(),
    planWeekId: integer("plan_week_id")
      .notNull()
      .references(() => planWeeks.id, { onDelete: "cascade" }),
    day: integer("day").notNull(),
    mealSlot: text("meal_slot").notNull(),
    recipeId: integer("recipe_id").references(() => recipes.id, {
      onDelete: "set null",
    }),
    locked: boolean("locked").notNull().default(false),
    reasons: jsonb("reasons").$type<string[]>().notNull().default([]),
    memberServings: jsonb("member_servings").$type<MemberServing[]>().notNull().default([]),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    check("plan_slots_day_check", sql`${table.day} BETWEEN 0 AND 6`),
    check("plan_slots_meal_slot_check", sql`${table.mealSlot} IN (${sqlInList(MEAL_SLOTS)})`),
    uniqueIndex("plan_slots_week_day_meal_slot_idx").on(
      table.planWeekId,
      table.day,
      table.mealSlot,
    ),
  ],
);

export const unitConversions = pgTable(
  "unit_conversions",
  {
    id: serial("id").primaryKey(),
    fromUnit: text("from_unit").notNull(),
    factor: numeric("factor", { mode: "number" }).notNull(),
    toBaseUnit: text("to_base_unit").notNull(),
    ingredientId: integer("ingredient_id").references(() => ingredients.id, {
      onDelete: "cascade",
    }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    check(
      "unit_conversions_to_base_unit_check",
      sql`${table.toBaseUnit} IN (${sqlInList(BASE_UNITS)})`,
    ),
    uniqueIndex("unit_conversions_from_unit_ingredient_id_idx").on(
      table.fromUnit,
      table.ingredientId,
    ),
    uniqueIndex("unit_conversions_universal_from_unit_idx")
      .on(table.fromUnit)
      .where(sql`${table.ingredientId} IS NULL`),
    index("unit_conversions_ingredient_id_idx").on(table.ingredientId),
  ],
);
