import { UserRole } from '@prisma/client'
import type { JwtVariables } from 'hono/jwt'
import { z } from 'zod'

export type JwtUser = {
  userId: number
  username: string
  userRole: z.infer<typeof userRoleSchema>
}

export type JwtPayload = JwtVariables<JwtUser>

export const userRoleSchema = z.nativeEnum(UserRole)
