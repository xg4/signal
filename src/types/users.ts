import { createSelectSchema } from 'drizzle-zod'
import type { JwtVariables } from 'hono/jwt'
import { z } from 'zod'
import { userRoleEnum, users } from '../db/schema'

export type JwtUser = {
  userId: number
  username: string
  userRole: UserRole
}

export type JwtPayload = JwtVariables<JwtUser>

export type User = typeof users.$inferSelect

export const rolesSchema = createSelectSchema(userRoleEnum)

export type UserRole = z.infer<typeof rolesSchema>
