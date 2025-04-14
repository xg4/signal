import { Queue } from 'bullmq'
import { QUEUE_NAMES, redisConnection } from '../config/queue'
import type { NotificationJob } from '../types/queue'

export const notificationQueue = new Queue<NotificationJob>(QUEUE_NAMES.NOTIFICATION, {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: {
      age: 60 * 60 * 24 * 7, // 7 day
      count: 1000,
    },
    attempts: 3,
    backoff: {
      type: 'fixed',
      delay: 1000,
    },
  },
})
