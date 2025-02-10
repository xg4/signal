import { JwtVariables } from 'hono/jwt'

export type JwtUser = {
  userId: number
  username: string
}

export type JwtPayload = JwtVariables<JwtUser>
