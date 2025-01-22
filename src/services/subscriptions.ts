import { eq } from 'drizzle-orm'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod'
import { db } from '../db/config'
import { subscriptions } from '../db/schema'
import { subscriptionSchema } from '../routes/subscriptions'
import { generateSubscriptionKey } from '../utils/crypto'
import { sendByDeviceCode } from './notifications'

export type Subscription = z.infer<typeof subscriptionSchema>['subscription']

export async function getSubscriptions() {
  return db
    .select({
      deviceCode: subscriptions.deviceCode,
    })
    .from(subscriptions)
}

export async function getSubscriptionByDeviceCode(deviceCode: string) {
  const [subscription] = await db.select().from(subscriptions).where(eq(subscriptions.deviceCode, deviceCode)).limit(1)
  return subscription
}

export async function createSubscription(subscription: Subscription) {
  const deviceCode = await generateSubscriptionKey(subscription)

  // 检查是否已经订阅
  const existingSubscription = await getSubscriptionByDeviceCode(deviceCode)
  if (existingSubscription) {
    throw new HTTPException(409, { message: '已经订阅' })
  }

  await db.insert(subscriptions).values({
    endpoint: subscription.endpoint,
    auth: subscription.keys.auth,
    p256dh: subscription.keys.p256dh,
    deviceCode,
  })

  try {
    await sendByDeviceCode(deviceCode, '订阅成功', '您已成功订阅所有活动通知')
  } catch (error) {
    console.error('发送欢迎通知失败:', error)
  }

  return deviceCode
}

export async function deleteSubscription(deviceCode: string) {
  const existingSubscription = await getSubscriptionByDeviceCode(deviceCode)
  if (!existingSubscription) {
    throw new HTTPException(404, { message: '订阅不存在' })
  }

  await db.delete(subscriptions).where(eq(subscriptions.deviceCode, deviceCode))
}
