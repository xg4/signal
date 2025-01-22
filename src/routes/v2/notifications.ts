import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'
import { sendByDeviceCode } from '../../services/notifications'
import { getSubscriptionByDeviceCode } from '../../services/subscriptions'

export const notificationsRouteV2 = new Hono().post(
  '/',
  zValidator('json', z.object({ deviceCode: z.string(), title: z.string(), body: z.string() })),
  async c => {
    const { deviceCode } = c.req.valid('json')
    const sub = await getSubscriptionByDeviceCode(deviceCode)
    if (!sub) {
      return c.json({ message: 'not found' }, { status: 404 })
    }
    const { title, body } = c.req.valid('json')
    await sendByDeviceCode(deviceCode, title, body)
    return c.json({ message: 'success' })
  },
)
