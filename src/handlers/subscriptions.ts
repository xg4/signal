import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '../middlewares/zod-validator'
import { subscriptionsService } from '../services'

export const subscriptionsHandler = new Hono()

const subscriptionSchema = z.object({
  endpoint: z
    .string({
      message: '无效的订阅链接',
    })
    .url({
      message: '无效的订阅链接',
    }),
  keys: z.object({
    auth: z.string(),
    p256dh: z.string(),
  }),
})

const subscriptionInsetSchema = z.object({
  subscription: subscriptionSchema,
})

subscriptionsHandler.post('/', zValidator('json', subscriptionInsetSchema), async c => {
  const { subscription } = c.req.valid('json')

  const userAgent = c.req.header('user-agent')
  const deviceCode = await subscriptionsService.generateSubscriptionKey({
    endpoint: subscription.endpoint,
    p256dh: subscription.keys.p256dh,
    auth: subscription.keys.auth,
  })

  const newSubscription = await subscriptionsService.saveSubscription({
    deviceCode,
    endpoint: subscription.endpoint,
    p256dh: subscription.keys.p256dh,
    auth: subscription.keys.auth,
    userAgent,
  })

  return c.json(newSubscription, 201)
})

const deviceCodeSchema = z.object({
  code: z
    .string({
      message: '无效的设备码',
    })
    .length(64, {
      message: '无效的设备码',
    }), // SHA-256 哈希值长度为 64 个字符
})

subscriptionsHandler.delete('/:code', zValidator('param', deviceCodeSchema), async c => {
  const { code } = c.req.valid('param')

  await subscriptionsService.deleteSubscription(code)

  return c.json(null)
})

subscriptionsHandler.get('/:code', zValidator('param', deviceCodeSchema), async c => {
  const { code } = c.req.valid('param')

  const existingSubscription = await subscriptionsService.getSubscriptionByCode(code)

  return c.json(!!existingSubscription)
})
