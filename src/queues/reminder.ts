import { Queue } from 'bullmq'
import { QUEUE_NAMES, redisConnection } from '../config/queue'
import type { ReminderJob } from '../types/queue'

export const reminderQueue = new Queue<ReminderJob>(QUEUE_NAMES.REMINDER, {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: true,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
  },
})
