import { Queue } from 'bullmq'
import { QUEUE_NAMES, redisConnection } from '../config/queue'
import type { RecurrenceJob } from '../types/queue'

export const recurrenceQueue = new Queue<RecurrenceJob>(QUEUE_NAMES.RECURRENCE, {
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
