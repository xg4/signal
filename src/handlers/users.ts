import type { Context } from 'hono'
import { userService } from '../services'

export const login = async (c: Context) => {
  const data = await userService.loginSchema.promise().parse(c.req.json())
  const result = await userService.login(data)
  return c.json(result)
}

export const register = async (c: Context) => {
  const data = await userService.loginSchema.promise().parse(c.req.json())
  const result = await userService.createUser(data)
  return c.json(result)
}

export const getCurrentUser = async (c: Context) => {
  const { userId } = c.get('jwtPayload')
  const user = await userService.getUserById(userId)
  return c.json(user)
}

export const getUsers = async (c: Context) => {
  const users = await userService.getUsers()
  return c.json(users)
}
