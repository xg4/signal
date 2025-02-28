import { drizzle } from 'drizzle-orm/bun-sql'
import { ProcessEnv } from '../env'
import * as schema from './schema'

export const db = drizzle(ProcessEnv.DATABASE_URL, {
  schema,
})
