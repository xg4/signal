import { eq } from 'drizzle-orm'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod'
import { db } from '../db'
import { users } from '../db/schema'
import { comparePassword, hashPassword } from '../utils/crypto'
import { generateToken } from '../utils/jwt'

const usernameSchema = z
  .string()
  .min(3, { message: '用户名至少需要 3 个字符' })
  .max(15, { message: '用户名最多 15 个字符' })
  .regex(/^[a-zA-Z][a-zA-Z0-9_-]*$/, {
    message: '用户名只能包含字母、数字、下划线_和连字符-，且必须以字母开头',
  })

export const loginSchema = z.object({
  username: usernameSchema,
  password: z.string(),
})

export type LoginData = z.infer<typeof loginSchema>

export async function login(data: LoginData) {
  const { username, password } = data

  const [user] = await db.select().from(users).where(eq(users.username, username))

  if (!user) {
    throw new HTTPException(400, { message: '用户名或密码错误' })
  }

  const isPasswordValid = await comparePassword(password, user.password)
  if (!isPasswordValid) {
    throw new HTTPException(400, { message: '用户名或密码错误' })
  }

  const token = await generateToken(user)

  return {
    token,
  }
}

export async function createUser(data: LoginData) {
  const { username, password } = data

  const [existingUser] = await db.select().from(users).where(eq(users.username, username))

  if (existingUser) {
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

  const token = await generateToken(newUser)

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
      role: users.role,
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
