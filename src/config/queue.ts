import type { ConnectionOptions } from 'bullmq'
import Redis from 'ioredis'
import { Env } from './env'

// Redis 连接配置
export const redisConnection: ConnectionOptions = new Redis(Env.REDIS_URL, {
  maxRetriesPerRequest: null,
})

// 队列名称
export const QUEUE_NAMES = {
  NOTIFICATION: 'notification-queue',
  REMINDER: 'reminder-queue',
  RECURRENCE: 'recurrence-queue',
}
