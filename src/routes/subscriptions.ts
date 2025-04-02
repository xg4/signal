import { Hono } from 'hono'
import { z } from 'zod'
import { adminRequired } from '../middlewares/auth'
import { zValidator } from '../middlewares/zod-validator'
import { subscriptionsService } from '../services'

export const subscriptionRoutes = new Hono()

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

subscriptionRoutes.post(
  '/',
  zValidator(
    'json',
    z.object({
      subscription: subscriptionSchema,
    }),
  ),
  async c => {
    const { subscription } = c.req.valid('json')

    const userAgent = c.req.header('user-agent')
    const deviceCode = await subscriptionsService.generateSubscriptionKey({
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    })

    const newSubscription = await subscriptionsService.create({
      deviceCode,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      userAgent,
    })

    return c.json(newSubscription, 201)
  },
)

const deviceCodeSchema = z.object({
  code: z
    .string({
      message: '无效的设备码',
    })
    .length(64, {
      message: '无效的设备码',
    }), // SHA-256 哈希值长度为 64 个字符
})

subscriptionRoutes.delete('/:code', zValidator('param', deviceCodeSchema), async c => {
  const { code } = c.req.valid('param')

  await subscriptionsService.remove(code)

  return c.json(null)
})

subscriptionRoutes.get('/:code', zValidator('param', deviceCodeSchema), async c => {
  const { code } = c.req.valid('param')
  const userAgent = c.req.header('user-agent')

  const existingSubscription = await subscriptionsService.getSubscriptionByCode(code)

  if (existingSubscription && userAgent && existingSubscription.userAgent !== userAgent) {
    await subscriptionsService
      .update(code, {
        userAgent,
      })
      .catch(null)
  }

  return c.json(!!existingSubscription)
})

subscriptionRoutes.post('/query', adminRequired, zValidator('json', subscriptionsService.querySchema), async c => {
  const queryData = c.req.valid('json')
  const [data, total] = await Promise.all([
    subscriptionsService.query(queryData),
    subscriptionsService.getCount(queryData.params),
  ])

  return c.json({ data, total })
})
