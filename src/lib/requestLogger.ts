import { randomUUID } from 'node:crypto'
import type { MiddlewareHandler } from 'hono'
import { logger } from './logger.js'

export const requestLogger: MiddlewareHandler = async (c, next) => {
  const requestId = randomUUID()
  const start = Date.now()

  await next()

  logger.info(
    {
      requestId,
      method: c.req.method,
      path: c.req.path,
      status: c.res.status,
      durationMs: Date.now() - start,
    },
    'request completed',
  )
}
