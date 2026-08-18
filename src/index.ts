import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { recipesRoute } from './routes/recipes.js'
import { requestLogger } from './lib/requestLogger.js'

const app = new Hono()

app.use(requestLogger)

app.get('/health', (c) => {
  return c.json({ status: 'ok' })
})

app.route('/api/recipes', recipesRoute)

serve({ fetch: app.fetch, port: 3000 })
