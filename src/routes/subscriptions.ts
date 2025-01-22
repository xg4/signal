import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'
import { createSubscription, deleteSubscription, getSubscriptionByDeviceCode } from '../services/subscriptions'

export const subscriptionSchema = z.object({
  subscription: z.object({
    endpoint: z.string().url(),
    keys: z.object({
      auth: z.string(),
      p256dh: z.string(),
    }),
  }),
})

const deviceCodeSchema = z.object({
  code: z.string().length(64), // SHA-256 哈希值长度为 64 个字符
})

export const subscriptionsRoute = new Hono()
  .post('/', zValidator('json', subscriptionSchema), async c => {
    const { subscription } = c.req.valid('json')
    const deviceCode = await createSubscription(subscription)
    return c.json(deviceCode, { status: 201 })
  })
  .get('/:code', zValidator('param', deviceCodeSchema), async c => {
    const { code } = c.req.valid('param')
    const exists = await getSubscriptionByDeviceCode(code)
    return c.json(!!exists)
  })
  .delete('/:code', zValidator('param', deviceCodeSchema), async c => {
    const { code } = c.req.valid('param')
    await deleteSubscription(code)
    return c.json({ message: '删除成功' })
  })
