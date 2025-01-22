import { zValidator } from '@hono/zod-validator'
import dayjs from 'dayjs'
import { eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { sign } from 'hono/jwt'
import { z } from 'zod'
import { db } from '../db/config'
import { users } from '../db/schema'
import { ProcessEnv } from '../env'
import { comparePassword } from '../utils/auth'

const authRoute = new Hono().post(
  '/login',
  zValidator('json', z.object({ username: z.string(), password: z.string() })),
  async c => {
    const { username, password } = c.req.valid('json')

    // 查询用户
    const [user] = await db.select().from(users).where(eq(users.username, username))

    if (!user) {
      return c.json({ message: '用户名或密码错误' }, 401)
    }

    // 验证密码
    const isValidPassword = await comparePassword(password, user.password)
    if (!isValidPassword) {
      return c.json({ message: '用户名或密码错误' }, 401)
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

    return c.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        nickname: user.nickname,
      },
    })
  },
)

export { authRoute }
