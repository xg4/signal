import { MiddlewareHandler } from 'hono'
import { every } from 'hono/combine'
import { HTTPException } from 'hono/http-exception'
import { jwt } from 'hono/jwt'
import { ProcessEnv } from '../env'
import { userService } from '../services'

export const userRequired = jwt({
  secret: ProcessEnv.JWT_SECRET,
})

export const adminRequired: MiddlewareHandler = every(userRequired, async (c, next) => {
  const { userId } = c.get('jwtPayload')
  const user = await userService.getUserById(userId)
  if (!user) {
    throw new HTTPException(403, { message: '无权限访问' })
  }
  await next()
})
