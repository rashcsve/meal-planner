import { integer, numeric, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core'

export const recipes = pgTable('recipes', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  time: integer('time').notNull(),
  kcal: numeric('kcal', { mode: 'number' }),
  cost: numeric('cost', { mode: 'number' }),
  meal: text('meal'),
  cuisine: text('cuisine'),
  protein: text('protein'),
  diet: text('diet'),
  source: text('source'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})
