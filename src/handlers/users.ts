import { Hono } from 'hono'
import { adminRequired, userRequired } from '../middlewares/auth'
import { zValidator } from '../middlewares/zod-validator'
import { userService } from '../services'

export const usersHandler = new Hono()

usersHandler.get('/me', userRequired, async c => {
  const { userId } = c.get('jwtPayload')
  const user = await userService.getUserById(userId)
  return c.json(user)
})

usersHandler.get('/users', adminRequired, async c => {
  const users = await userService.getUsers()
  return c.json(users)
})

usersHandler.post('/login', zValidator('json', userService.loginSchema), async c => {
  const data = c.req.valid('json')
  const result = await userService.login(data)
  return c.json(result)
})

usersHandler.post('/register', zValidator('json', userService.loginSchema), async c => {
  const data = c.req.valid('json')
  const result = await userService.createUser(data)
  return c.json(result)
})
