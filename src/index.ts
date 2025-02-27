import { migrate } from 'drizzle-orm/bun-sqlite/migrator'
import app from './app'
import { db } from './db'
import { ProcessEnv } from './env'
import { scheduleService } from './services'

await migrate(db, { migrationsFolder: './drizzle' })

await scheduleService.initSchedules()

const port = ProcessEnv.PORT

Bun.serve({
  fetch: app.fetch,
  port,
})

console.log(`🚀 Server is running on http://localhost:${port}`)
