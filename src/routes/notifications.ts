import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'
import { authMiddleware } from '../middlewares'
import { notificationService, subscriptionService } from '../services'

export const notificationRouter = new Hono()

notificationRouter.post(
  '/notifications',
  authMiddleware.adminRequired,
  zValidator('json', z.object({ deviceCode: z.string(), title: z.string(), body: z.string() })),
  async c => {
    const { deviceCode, title, body } = c.req.valid('json')
    const sub = await subscriptionService.getSubscriptionByDeviceCode(deviceCode)
    if (!sub) {
      return c.json({ message: 'not found' }, { status: 404 })
    }
    await notificationService.sendByDeviceCode(deviceCode, title, body)
    return c.json({ message: 'success' })
  },
)
