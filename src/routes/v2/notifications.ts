import { zValidator } from '@hono/zod-validator'
import { eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { z } from 'zod'
import { db } from '../../db/config'
import { subscriptions } from '../../db/schema'
import { sendByDeviceCode } from '../../services/notifications'

export const notificationsRoute = new Hono().post(
  '/',
  zValidator('json', z.object({ deviceCode: z.string(), title: z.string(), body: z.string() })),
  async c => {
    const { deviceCode } = c.req.valid('json')
    const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.deviceCode, deviceCode)).limit(1)
    if (!sub) {
      return c.json({ message: 'not found' }, { status: 404 })
    }
    const { title, body } = c.req.valid('json')
    await sendByDeviceCode(deviceCode, title, body)
    return c.json({ message: 'success' })
  },
)
