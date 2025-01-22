import dayjs from 'dayjs'
import { eq } from 'drizzle-orm'
import { HTTPException } from 'hono/http-exception'
import { sign } from 'hono/jwt'
import { z } from 'zod'
import { db } from '../db/config'
import { users } from '../db/schema'
import { ProcessEnv } from '../env'
import { comparePassword } from '../utils/auth'

export const loginSchema = z.object({
  username: z.string(),
  password: z.string(),
})

export type LoginData = z.infer<typeof loginSchema>

export async function login(data: LoginData) {
  const { username, password } = data

  // 查询用户
  const [user] = await db.select().from(users).where(eq(users.username, username))

  if (!user) {
    throw new HTTPException(401, { message: '用户名或密码错误' })
  }

  // 验证密码
  const isValidPassword = await comparePassword(password, user.password)
  if (!isValidPassword) {
    throw new HTTPException(401, { message: '用户名或密码错误' })
  }

  // 签发 JWT token
  const token = await sign(
    {
      userId: user.id,
      username: user.username,
      nickname: user.nickname,
      exp: dayjs().add(7, 'day').unix(),
      iat: dayjs().unix(),
    },
    ProcessEnv.JWT_SECRET,
  )

  return {
    token,
    user: {
      id: user.id,
      username: user.username,
      nickname: user.nickname,
    },
  }
}
