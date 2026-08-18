import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { createRecipe, listRecipes } from '../services/recipes.js'

const createRecipeSchema = z.object({
  title: z.string().min(1),
  minutes: z.number().int().positive(),
})

export const recipesRoute = new Hono()

recipesRoute.get('/', async (c) => {
  const recipes = await listRecipes()
  return c.json(recipes)
})

recipesRoute.post('/', zValidator('json', createRecipeSchema), async (c) => {
  const data = c.req.valid('json')
  const recipe = await createRecipe(data)
  return c.json(recipe, 201)
})
