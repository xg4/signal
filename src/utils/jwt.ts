import dayjs from 'dayjs'
import { sign } from 'hono/jwt'
import { Env } from '../config/env'
import type { User } from '../types'

export function generateToken(user: User): Promise<string> {
  return sign(
    {
      userId: user.id,
      username: user.username,
      userRole: user.role,
      exp: dayjs().add(1, 'month').unix(),
      iat: dayjs().unix(),
    },
    Env.JWT_SECRET,
  )
}
