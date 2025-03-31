import type { Subscription } from '@prisma/client'
import type { NotificationPayload } from '../utils/push'

export interface NotificationJob {
  subscription: Subscription
  payload: NotificationPayload
}

export type ReminderJob = {
  eventId: number
  scheduledAt: Date
}

export type RecurrenceJob = { id: number }
