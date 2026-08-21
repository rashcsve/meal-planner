import { Hono } from 'hono'
import { afterEach, describe, expect, it } from 'vitest'
import { db } from '../src/db/index.js'
import { recipes } from '../src/db/schema.js'
import { recipesRoute } from '../src/routes/recipes.js'
import { errorHandler } from '../src/lib/errorHandler.js'

const app = new Hono().onError(errorHandler).route('/api/recipes', recipesRoute)

afterEach(async () => {
  await db.delete(recipes)
})

async function seedRecipe(overrides: Partial<{ title: string; time: number }> = {}) {
  const [recipe] = await db
    .insert(recipes)
    .values({ title: 'Pancakes', time: 20, ...overrides })
    .returning()
  return recipe!
}

describe('GET /api/recipes', () => {
  it('returns the rows currently in the table', async () => {
    await seedRecipe({ title: 'Pancakes' })
    await seedRecipe({ title: 'Waffles' })

    const res = await app.request('/api/recipes')
    expect(res.status).toBe(200)
    const body = (await res.json()) as { title: string }[]
    expect(body).toHaveLength(2)
    expect(body.map((r) => r.title).sort()).toEqual(['Pancakes', 'Waffles'])
  })
})

describe('GET /api/recipes/:id', () => {
  it('returns the matching recipe', async () => {
    const seeded = await seedRecipe({ title: 'Pancakes' })

    const res = await app.request(`/api/recipes/${seeded.id}`)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toMatchObject({ id: seeded.id, title: 'Pancakes' })
  })

  it('returns 404 for an id that does not exist', async () => {
    const res = await app.request('/api/recipes/999999')
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body).toEqual({ error: { message: 'Recipe not found' } })
  })
})

describe('POST /api/recipes', () => {
  it('creates a recipe and persists it', async () => {
    const postRes = await app.request('/api/recipes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Pancakes', time: 20 }),
    })
    expect(postRes.status).toBe(201)
    const created = (await postRes.json()) as { id: number }

    const getRes = await app.request(`/api/recipes/${created.id}`)
    expect(getRes.status).toBe(200)
    const fetched = await getRes.json()
    expect(fetched).toEqual(created)
  })

  it('returns 422 with field errors for an invalid body', async () => {
    const res = await app.request('/api/recipes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ time: -5 }),
    })
    expect(res.status).toBe(422)
    const body = (await res.json()) as { error: { message: string; details: unknown } }
    expect(body.error.message).toBe('Validation failed')
    expect(body.error.details).toBeDefined()
  })

  it('returns 409 for a duplicate title', async () => {
    await seedRecipe({ title: 'Pancakes' })

    const res = await app.request('/api/recipes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Pancakes', time: 15 }),
    })
    expect(res.status).toBe(409)
    const body = (await res.json()) as { error: { message: string } }
    expect(body.error.message).toBe('A recipe titled "Pancakes" already exists')
  })
})
