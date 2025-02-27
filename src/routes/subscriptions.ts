import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'
import { authMiddleware } from '../middlewares'
import { subscriptionService } from '../services'

export const subscriptionRouter = new Hono()

const deviceCodeSchema = z.object({
  code: z
    .string({
      message: '无效的设备码',
    })
    .length(64, {
      message: '无效的设备码',
    }), // SHA-256 哈希值长度为 64 个字符
})

subscriptionRouter.get('/subscriptions/:code', zValidator('param', deviceCodeSchema), async c => {
  const { code } = c.req.valid('param')
  const exists = await subscriptionService.getSubscriptionByDeviceCode(code)
  return c.json(!!exists)
})

subscriptionRouter.post('/subscriptions', zValidator('json', subscriptionService.createSubscriptionSchema), async c => {
  const { subscription } = c.req.valid('json')

  const deviceCode = await subscriptionService.createSubscription(subscription)
  return c.json(deviceCode, { status: 201 })
})

subscriptionRouter.delete('/subscriptions/:code', zValidator('param', deviceCodeSchema), async c => {
  const { code } = c.req.valid('param')
  await subscriptionService.deleteSubscription(code)
  return c.json({ message: '删除成功' })
})

subscriptionRouter.put(
  '/subscriptions/:code',
  authMiddleware.adminRequired,
  zValidator('param', deviceCodeSchema),
  zValidator('json', subscriptionService.updateSchema),
  async c => {
    const { code } = c.req.valid('param')
    const data = c.req.valid('json')
    const current = await subscriptionService.updateSubscriptionByDeviceCode(code, data)
    return c.json(current)
  },
)

subscriptionRouter.post(
  '/subscriptions/json',
  authMiddleware.adminRequired,
  zValidator('json', subscriptionService.createSubscriptionsSchema.array().min(1)),
  async c => {
    const data = c.req.valid('json')

    const deviceCode = await subscriptionService.createSubscriptionByJSON(data)
    return c.json(deviceCode, { status: 201 })
  },
)

subscriptionRouter.get('/subscriptions', authMiddleware.adminRequired, async c => {
  const list = await subscriptionService.getSubscriptions()
  return c.json(list)
})
