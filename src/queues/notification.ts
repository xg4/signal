import { Queue } from 'bullmq'
import { QUEUE_NAMES, redisConnection } from '../config/queue'
import type { NotificationJob } from '../types/queue'

export const notificationQueue = new Queue<NotificationJob>(QUEUE_NAMES.NOTIFICATION, {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: true,
    attempts: 3,
    backoff: {
      type: 'fixed',
      delay: 1000,
    },
  },
})
