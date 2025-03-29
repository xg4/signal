import { drizzle } from 'drizzle-orm/bun-sql'
import { Env } from '../config/env'
import * as schema from './schema'

export const db = drizzle(Env.DATABASE_URL, {
  schema,
})
