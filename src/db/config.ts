import { drizzle } from 'drizzle-orm/node-postgres'
import { ProcessEnv } from '../env'

export const db = drizzle(ProcessEnv.DATABASE_URL)
