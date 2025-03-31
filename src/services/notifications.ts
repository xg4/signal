import type { Subscription } from '@prisma/client'
import { notificationQueue } from '../queues/notification'
import type { NotificationPayload } from '../utils/push'

export async function enqueue(subscription: Subscription, payload: NotificationPayload) {
  return notificationQueue.add('notification', { subscription, payload })
}
