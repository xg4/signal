import { UserRole } from '@prisma/client'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod'
import { adminRequired, userRequired } from '../middlewares/auth'
import { zValidator } from '../middlewares/zod-validator'
import { usersService } from '../services'
import { userRoleSchema } from '../types'
import { idValidator } from '../utils/validator'

export const userRoutes = new Hono()

userRoutes.get('/me', userRequired, async c => {
  const { userId } = c.get('jwtPayload')
  const user = await usersService.getUserById(userId)
  return c.json(user)
})

userRoutes.post('/users/query', adminRequired, zValidator('json', usersService.querySchema), async c => {
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

userRoutes.post(
  '/users/:id/chmod',
  adminRequired,
  zValidator('param', idValidator),
  zValidator(
    'json',
    z.object({
      role: userRoleSchema,
    }),
  ),
  async c => {
    const { id } = c.req.valid('param')
    const user = await usersService.getUserById(id)
    if (!user) {
      throw new HTTPException(404, {
        message: '用户未找到',
      })
    }

    const { userId } = c.get('jwtPayload')
    if (user.role === UserRole.ADMIN && userId !== id) {
      throw new HTTPException(403, {
        message: '无法修改管理员权限',
      })
    }

    const { role } = c.req.valid('json')
    await usersService.chmod(id, role)
    return c.json(null)
  },
)

userRoutes.post(
  '/users/:id/reset',
  adminRequired,
  zValidator('param', idValidator),
  zValidator(
    'json',
    z.object({
      password: z.string(),
    }),
  ),
  async c => {
    const { id } = c.req.valid('param')
    const user = await usersService.getUserById(id)
    if (!user) {
      throw new HTTPException(404, {
        message: '用户未找到',
      })
    }

    const { userId } = c.get('jwtPayload')
    if (user.role === UserRole.ADMIN && userId !== id) {
      throw new HTTPException(403, {
        message: '无法重置管理员密码',
      })
    }

    const { password } = c.req.valid('json')
    await usersService.reset(id, password)
    return c.json(null)
  },
)
