import { migrate } from 'drizzle-orm/bun-sql/migrator'
import app from './app'
import { Env } from './config/env'
import { db } from './db'

await migrate(db, { migrationsFolder: './drizzle' })

const port = Env.PORT

export default {
  fetch: app.fetch,
  port,
}
