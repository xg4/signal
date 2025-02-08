import { Context } from 'hono'
import { z } from 'zod'
import { notificationService, subscriptionService } from '../services'

const messageSchema = z.object({ deviceCode: z.string(), title: z.string(), body: z.string() })

export const sendMessage = async (c: Context) => {
  const { deviceCode, title, body } = await messageSchema.promise().parse(c.req.json())
  const sub = await subscriptionService.getSubscriptionByDeviceCode(deviceCode)
  if (!sub) {
    return c.json({ message: 'not found' }, { status: 404 })
  }
  await notificationService.sendByDeviceCode(deviceCode, title, body)
  return c.json({ message: 'success' })
}
