import type { MiddlewareHandler } from 'hono'
import { every } from 'hono/combine'
import { HTTPException } from 'hono/http-exception'
import { jwt } from 'hono/jwt'
import { ProcessEnv } from '../env'

export const userRequired = jwt({
  secret: ProcessEnv.JWT_SECRET,
})

export const adminRequired: MiddlewareHandler = every(userRequired, async (c, next) => {
  const { userRole } = c.get('jwtPayload')
  if (userRole !== 'admin') {
    throw new HTTPException(403, { message: '无权限访问' })
  }
  await next()
})
