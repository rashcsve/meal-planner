import { PostgreSqlContainer } from '@testcontainers/postgresql'
import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { Pool } from 'pg'

export default async function setup() {
  const container = await new PostgreSqlContainer('postgres:17').start()
  process.env.DATABASE_URL = container.getConnectionUri()
  process.env.CORS_ORIGIN ??= 'http://localhost:5173'

  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  await migrate(drizzle(pool), { migrationsFolder: './drizzle' })
  await pool.end()

  return async () => {
    await container.stop()
  }
}
