import type { Prisma } from '@prisma/client'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod'
import { userRoleSchema } from '../types'
import { comparePassword, hashPassword } from '../utils/crypto'
import { generateOffset, orderSchema, pageSchema } from '../utils/filter'
import { generateToken } from '../utils/jwt'
import { prisma } from '../utils/prisma'

export async function reset(userId: number, password: string) {
  const hashPwd = await hashPassword(password)
  return prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      password: hashPwd,
    },
  })
}

export function chmod(userId: number, role: z.infer<typeof userRoleSchema>) {
  return prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      role,
    },
  })
}

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

  const user = await prisma.user.findUnique({
    where: {
      username,
    },
  })

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

  const existingUser = await prisma.user.findUnique({
    where: {
      username,
    },
  })

  if (existingUser) {
    throw new HTTPException(400, { message: '用户名已存在' })
  }

  const hashedPwd = await hashPassword(password)

  const newUser = await prisma.user.create({
    data: {
      username,
      password: hashedPwd,
    },
  })

  const token = await generateToken(newUser)

  return {
    token,
  }
}

export async function getUserById(id: number) {
  const user = await prisma.user.findUnique({
    where: {
      id,
    },
    select: {
      id: true,
      username: true,
      nickname: true,
      createdAt: true,
      role: true,
    },
  })

  return user
}

export const paramsSchema = z
  .object({
    username: z.string().trim(),
    role: userRoleSchema,
    createdAt: z.coerce.date().array(),
  })
  .partial()

export const sortSchema = z
  .object({
    createdAt: orderSchema,
  })
  .partial()

export const querySchema = z.object({
  params: paramsSchema.merge(pageSchema),
  sort: sortSchema,
})

function generateConditions(params: z.infer<typeof paramsSchema>) {
  const [gte, lte] = params.createdAt || []
  const conditions: Prisma.UserWhereInput = {
    createdAt: {
      gte,
      lte,
    },
    username: {
      startsWith: params.username,
    },
    role: params.role,
    deletedAt: null,
  }

  return conditions
}

export async function getCount(params: z.infer<typeof paramsSchema>) {
  return prisma.user.count({
    where: generateConditions(params),
  })
}

export async function getUsers({ params, sort }: z.infer<typeof querySchema>) {
  return prisma.user.findMany({
    where: generateConditions(params),
    select: {
      id: true,
      username: true,
      nickname: true,
      role: true,
      createdAt: true,
    },
    orderBy: sort,
    ...generateOffset(params),
  })
}
