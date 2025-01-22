import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { login, loginSchema } from '../services/user'

export const authRoute = new Hono().post('/login', zValidator('json', loginSchema), async c => {
  const data = c.req.valid('json')
  const result = await login(data)
  return c.json(result)
})
