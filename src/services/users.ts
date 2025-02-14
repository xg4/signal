import dayjs from 'dayjs'
import { eq } from 'drizzle-orm'
import { HTTPException } from 'hono/http-exception'
import { sign } from 'hono/jwt'
import { z } from 'zod'
import { db } from '../db'
import { users } from '../db/schema'
import { ProcessEnv } from '../env'
import { comparePassword, hashPassword } from '../utils/crypto'

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
    throw new HTTPException(400, { message: '用户名或密码错误' })
  }

  // 验证密码
  const isValidPassword = await comparePassword(password, user.password)
  if (!isValidPassword) {
    throw new HTTPException(400, { message: '用户名或密码错误' })
  }

  // 签发 JWT token
  const token = await sign(
    {
      userId: user.id,
      username: user.username,
      exp: dayjs().add(1, 'month').unix(),
      iat: dayjs().unix(),
    },
    ProcessEnv.JWT_SECRET,
  )

  return {
    token,
  }
}

export async function createUser(data: LoginData) {
  const { username, password } = data

  // 查询用户
  const [user] = await db.select().from(users).where(eq(users.username, username))

  if (user) {
    throw new HTTPException(400, { message: '用户名已存在' })
  }

  const hashedPwd = await hashPassword(password)

  const [newUser] = await db
    .insert(users)
    .values({
      username,
      password: hashedPwd,
    })
    .returning()

  if (!newUser) {
    throw new HTTPException()
  }

  // 签发 JWT token
  const token = await sign(
    {
      userId: newUser.id,
      username: newUser.username,
      exp: dayjs().add(1, 'month').unix(),
      iat: dayjs().unix(),
    },
    ProcessEnv.JWT_SECRET,
  )

  return {
    token,
  }
}

export async function getUserById(id: number) {
  const [user] = await db
    .select({
      id: users.id,
      username: users.username,
      nickname: users.nickname,
      createdAt: users.createdAt,
      isAdmin: users.isAdmin,
    })
    .from(users)
    .where(eq(users.id, id))
    .limit(1)
  return user
}

export async function getUsers() {
  return db
    .select({
      id: users.id,
      username: users.username,
      nickname: users.nickname,
      createdAt: users.createdAt,
    })
    .from(users)
}
