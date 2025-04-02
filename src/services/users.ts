import type { Prisma } from '@prisma/client'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod'
import { userRoleSchema } from '../types'
import { comparePassword, hashPassword } from '../utils/crypto'
import { generateToken } from '../utils/jwt'
import { prisma } from '../utils/prisma'

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

export const userParamsSchema = z.object({
  pageSize: z.coerce.number().default(20),
  current: z.coerce.number().default(1),
  createdAt: z.coerce.date().array().optional(),
  username: z.string().trim().optional(),
  role: userRoleSchema.optional(),
})

export const userQuerySchema = z.object({
  params: userParamsSchema,
})

function generateConditions(params: z.infer<typeof userParamsSchema>) {
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

export async function getCount(params: z.infer<typeof userParamsSchema>) {
  return prisma.user.count({
    where: generateConditions(params),
  })
}

export async function getUsers({ params }: z.infer<typeof userQuerySchema>) {
  const take = params.pageSize
  const skip = (params.current - 1) * params.pageSize

  return prisma.user.findMany({
    where: generateConditions(params),
    select: {
      id: true,
      username: true,
      nickname: true,
      role: true,
      createdAt: true,
    },
    take,
    skip,
  })
}
