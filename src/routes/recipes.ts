import { Hono } from 'hono'
import { listRecipes } from '../services/recipes.js'

export const recipesRoute = new Hono()

recipesRoute.get('/', async (c) => {
  const recipes = await listRecipes()
  return c.json(recipes)
})
