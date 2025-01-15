import { Hono } from 'hono'
import { db } from '../../db/config'
import { subscriptions } from '../../db/schema'

export const subscriptionsRoute = new Hono().get('/', async c => {
  try {
    const list = await db
      .select({
        deviceCode: subscriptions.deviceCode,
      })
      .from(subscriptions)

    return c.json(list)
  } catch (error) {
    console.error('检查订阅状态失败:', error)
    return c.json({ error: '检查订阅状态失败' }, { status: 500 })
  }
})
