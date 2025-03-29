import type { Subscription } from '../types'
import type { NotificationPayload } from '../utils/push'

export interface NotificationJob {
  subscription: Subscription
  payload: NotificationPayload
}
