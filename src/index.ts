import { migrate } from 'drizzle-orm/bun-sql/migrator'
import app from './app'
import { db } from './db'
import { ProcessEnv } from './env'
import { schedulesService } from './services'
import { initWebPush } from './utils/notifications'

await migrate(db, { migrationsFolder: './drizzle' })

await initWebPush()
await schedulesService.initScheduler()

const port = ProcessEnv.PORT

export default {
  fetch: app.fetch,
  port,
}
