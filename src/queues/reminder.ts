import { Queue } from 'bullmq'
import { QUEUE_NAMES, redisConnection } from '../config/queue'
import type { Reminder } from '../types'

export const reminderQueue = new Queue<Reminder>(QUEUE_NAMES.REMINDER, {
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
