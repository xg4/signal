import { Hono } from 'hono'
import { adminRequired, userRequired } from '../middlewares/auth'
import { zValidator } from '../middlewares/zod-validator'
import { usersService } from '../services'

export const userRoutes = new Hono()

userRoutes.get('/me', userRequired, async c => {
  const { userId } = c.get('jwtPayload')
  const user = await usersService.getUserById(userId)
  return c.json(user)
})

userRoutes.get('/users', adminRequired, async c => {
  const users = await usersService.getUsers()
  return c.json(users)
})

userRoutes.post('/login', zValidator('json', usersService.loginSchema), async c => {
  const data = c.req.valid('json')
  const result = await usersService.login(data)
  return c.json(result)
})

userRoutes.post('/register', zValidator('json', usersService.loginSchema), async c => {
  const data = c.req.valid('json')
  const result = await usersService.createUser(data)
  return c.json(result)
})
