import { Database } from 'bun:sqlite'
import { drizzle } from 'drizzle-orm/bun-sqlite'
import { ProcessEnv } from '../env'

const client = new Database(ProcessEnv.DATABASE_URL)
export const db = drizzle({ client })
