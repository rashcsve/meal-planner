import { Hono } from 'hono'
import { afterEach, describe, expect, it } from 'vitest'
import { db } from '../src/db/index.js'
import { recipes } from '../src/db/schema.js'
import { recipesRoute } from '../src/routes/recipes.js'

const app = new Hono().route('/api/recipes', recipesRoute)

afterEach(async () => {
  await db.delete(recipes)
})

describe('POST /api/recipes then GET /api/recipes', () => {
  it('returns the created recipe in the list', async () => {
    const postRes = await app.request('/api/recipes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Pancakes', minutes: 20 }),
    })
    expect(postRes.status).toBe(201)
    const created = await postRes.json()
    expect(created).toMatchObject({ title: 'Pancakes', minutes: 20 })

    const getRes = await app.request('/api/recipes')
    expect(getRes.status).toBe(200)
    const list = await getRes.json()
    expect(list).toContainEqual(created)
  })
})
