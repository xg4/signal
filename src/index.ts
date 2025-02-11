import { migrate } from 'drizzle-orm/bun-sqlite/migrator'
import app from './app'
import { db } from './db'
import { ProcessEnv } from './env'
import { scheduleService } from './services'

const port = ProcessEnv.PORT

await migrate(db, { migrationsFolder: './drizzle' })

await scheduleService.initSchedules()

Bun.serve({
  fetch: app.fetch,
  port,
})

// console.log(`🚀 Server is running on http://localhost:${port}`)
