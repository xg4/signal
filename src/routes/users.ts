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

userRoutes.post('/users/query', adminRequired, zValidator('json', usersService.userQuerySchema), async c => {
  const queryData = c.req.valid('json')
  const [data, total] = await Promise.all([usersService.getUsers(queryData), usersService.getCount(queryData.params)])
  return c.json({
    data,
    total,
  })
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
