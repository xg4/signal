import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { authMiddleware } from '../middlewares'
import { userService } from '../services'

export const userRouter = new Hono()

userRouter.get('/current', authMiddleware.userRequired, async c => {
  const { userId } = c.get('jwtPayload')
  const user = await userService.getUserById(userId)
  return c.json(user)
})

userRouter.get('/users', authMiddleware.adminRequired, async c => {
  const users = await userService.getUsers()
  return c.json(users)
})

userRouter.post('/login', zValidator('json', userService.loginSchema), async c => {
  const data = c.req.valid('json')
  const result = await userService.login(data)
  return c.json(result)
})

userRouter.post('/register', zValidator('json', userService.loginSchema), async c => {
  const data = c.req.valid('json')
  const result = await userService.createUser(data)
  return c.json(result)
})
