import { z } from 'zod'

const Env = z.object({
  PORT: z.coerce.number().int().default(3789),
  HOSTNAME: z.string().default('localhost'),
  VAPID_PUBLIC_KEY: z.string(),
  VAPID_PRIVATE_KEY: z.string(),
  DATABASE_URL: z.string(),
})

export const ProcessEnv = Env.parse(process.env)
