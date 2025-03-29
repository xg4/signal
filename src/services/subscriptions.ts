import { eq } from 'drizzle-orm'
import { createInsertSchema } from 'drizzle-zod'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod'
import { notificationsService } from '.'
import { db } from '../db'
import { subscriptions } from '../db/schema'
import { sha256 } from '../utils/crypto'

export const subscriptionsInsetSchema = createInsertSchema(subscriptions, {
  endpoint: s =>
    s.url({
      message: '无效的订阅链接',
    }),
}).omit({
  id: true,
  createdAt: true,
})

export function generateSubscriptionKey(
  subscription: Pick<z.infer<typeof subscriptionsInsetSchema>, 'endpoint' | 'auth' | 'p256dh'>,
) {
  return sha256([subscription.endpoint, subscription.auth, subscription.p256dh].join('|'))
}

export async function getSubscriptionByDeviceCode(deviceCode: string) {
  const [subscription] = await db.select().from(subscriptions).where(eq(subscriptions.deviceCode, deviceCode)).limit(1)
  return subscription
}

export const updateSchema = subscriptionsInsetSchema.partial()

export async function updateSubscription(deviceCode: string, data: z.infer<typeof updateSchema>) {
  const existingSubscription = await getSubscriptionByCode(deviceCode)
  if (!existingSubscription) {
    throw new HTTPException(404, { message: '订阅不存在' })
  }
  const [updated] = await db.update(subscriptions).set(data).where(eq(subscriptions.deviceCode, deviceCode)).returning()
  return updated
}

export async function saveSubscription(data: z.infer<typeof subscriptionsInsetSchema>) {
  const existingSubscription = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.deviceCode, data.deviceCode),
  })

  if (existingSubscription) {
    const [updated] = await db
      .update(subscriptions)
      .set(data)
      .where(eq(subscriptions.deviceCode, data.deviceCode))
      .returning()

    return updated
  }

  const [newSubscription] = await db.insert(subscriptions).values(data).returning()

  await notificationsService.enqueue(newSubscription, {
    title: '订阅成功',
    body: '您已成功订阅所有活动通知',
  })

  return newSubscription
}

export async function getSubscriptionByCode(deviceCode: string) {
  return db.query.subscriptions.findFirst({
    where: eq(subscriptions.deviceCode, deviceCode),
  })
}

export async function deleteSubscription(deviceCode: string) {
  const existingSubscription = await getSubscriptionByCode(deviceCode)
  if (!existingSubscription) {
    throw new HTTPException(404, { message: '订阅不存在' })
  }

  await db.delete(subscriptions).where(eq(subscriptions.deviceCode, deviceCode))
}
