import { UserRole } from '@prisma/client'
import type { JwtVariables } from 'hono/jwt'
import { z } from 'zod'

export type JwtUser = {
  userId: number
  username: string
  userRole: z.infer<typeof UserRoleSchema>
}

export type JwtPayload = JwtVariables<JwtUser>

export const UserRoleSchema = z.nativeEnum(UserRole)
