import { z } from 'zod'

const Env = z.object({
  PORT: z.coerce.number().int().default(3789),
  DATABASE_URL: z.string().default('./sqlite.db'),
  JWT_SECRET: z.string(),
  VAPID_PUBLIC_KEY: z.string(),
  VAPID_PRIVATE_KEY: z.string(),
})

export const ProcessEnv = Env.parse(process.env)
