import { eq } from 'drizzle-orm'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod'
import { notificationService } from '.'
import { db } from '../db'
import { subscriptions } from '../db/schema'
import { sha256 } from '../utils/crypto'

export const subscriptionSchema = z.object({
  subscription: z.object({
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
  }),
})

export type Subscription = z.infer<typeof subscriptionSchema>['subscription']

export function generateSubscriptionKey(subscription: Subscription) {
  return sha256([subscription.endpoint, subscription.keys.auth, subscription.keys.p256dh].join('|'))
}

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
    await notificationService.sendByDeviceCode(deviceCode, '订阅成功', '您已成功订阅所有活动通知')
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
