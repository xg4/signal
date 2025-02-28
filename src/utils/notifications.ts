import { HTTPException } from 'hono/http-exception'
import { defaults, get } from 'lodash-es'
import webPush from 'web-push'
import { ProcessEnv } from '../env'
import type { Subscription } from '../types'

// Initialize web push with VAPID keys
export function initWebPush() {
  const vapidPublicKey = ProcessEnv.VAPID_PUBLIC_KEY
  const vapidPrivateKey = ProcessEnv.VAPID_PRIVATE_KEY
  const vapidSubject = ProcessEnv.VAPID_SUBJECT

  webPush.setVapidDetails(`mailto:${vapidSubject}`, vapidPublicKey, vapidPrivateKey)

  console.log('Web Push initialized')
}

// Interface for notification payload
interface NotificationPayload {
  title: string
  body: string
  icon?: string
  badge?: string
  image?: string
  data?: any
  actions?: Array<{
    action: string
    title: string
    icon?: string
  }>
}

const defaultPayload = {
  icon: '/images/icon_128x128.png',
}

// Send notification to a subscription
export async function sendNotification(subscription: Subscription, payload: NotificationPayload) {
  try {
    const pushSubscription = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.p256dh,
        auth: subscription.auth,
      },
    }

    await webPush.sendNotification(pushSubscription, JSON.stringify(defaults(payload, defaultPayload)))
  } catch (error) {
    console.error('Error sending notification:', error)
    const statusCode = get(error, 'statusCode')
    if (statusCode) {
      throw new HTTPException(statusCode)
    }
    throw error
  }
}

export function getVapidPublicKey() {
  return ProcessEnv.VAPID_PUBLIC_KEY
}
