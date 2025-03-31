import type { Subscription } from '@prisma/client'
import webPush from 'web-push'
import { z } from 'zod'
import { Env } from '../config/env'
import { logger } from './log'

// Initialize web push with VAPID keys
export function initWebPush() {
  const vapidPublicKey = Env.VAPID_PUBLIC_KEY
  const vapidPrivateKey = Env.VAPID_PRIVATE_KEY
  const vapidSubject = Env.VAPID_SUBJECT

  webPush.setVapidDetails(`mailto:${vapidSubject}`, vapidPublicKey, vapidPrivateKey)

  logger.info('Web Push initialized')
}

export type NotificationPayload = z.infer<typeof payloadSchema>

const payloadSchema = z
  .object({
    title: z.string(),
    body: z.string(),
    icon: z.string().url().default('/images/icon_128x128.png'),
    image: z.string().url(),
    tag: z.string(),
    data: z.record(z.any()), // 允许任意类型的数据
    actions: z.array(
      z.object({
        action: z.string(),
        title: z.string(),
        icon: z.string().url(),
      }),
    ),
    url: z.string().url(),
  })
  .partial()

// Send notification to a subscription
export async function sendNotification(subscription: Subscription, payload: NotificationPayload) {
  const validPayload = payloadSchema.parse(payload)
  const pushSubscription = {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.p256dh,
      auth: subscription.auth,
    },
  }

  await webPush.sendNotification(pushSubscription, JSON.stringify(validPayload))
}

export function getVapidPublicKey() {
  return Env.VAPID_PUBLIC_KEY
}
