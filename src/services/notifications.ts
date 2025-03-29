import { notificationQueue } from '../queues/notification'
import type { Subscription } from '../types'
import type { NotificationPayload } from '../utils/push'

export async function enqueue(subscription: Subscription, payload: NotificationPayload) {
  return notificationQueue.add('notification', { subscription, payload })
}
