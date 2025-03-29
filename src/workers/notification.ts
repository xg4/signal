import { Job, Worker } from 'bullmq'
import { eq } from 'drizzle-orm'
import { get } from 'lodash-es'
import { QUEUE_NAMES, redisConnection } from '../config/queue'
import { db } from '../db'
import { subscriptions } from '../db/schema'
import type { NotificationJob } from '../types/queue'
import { logger as _logger } from '../utils/log'
import { sendNotification } from '../utils/push'

const notificationWorker = new Worker<NotificationJob>(QUEUE_NAMES.NOTIFICATION, processNotificationJob, {
  connection: redisConnection,
  concurrency: 20,
})

const logger = _logger.child({ worker: ['✉️', notificationWorker.name].join(': ') })

// 创建邮件工作进程处理函数
async function processNotificationJob(job: Job<NotificationJob>) {
  logger.info(`🔔 正在处理通知任务 ${job.id}`)
  const { subscription, payload } = job.data
  await sendNotification(subscription, payload)
}

// 监听事件
notificationWorker.on('completed', async (job: Job<NotificationJob>) => {
  await job.updateProgress(100)

  logger.info(`✅ 工作进程 ${notificationWorker.name}: 任务 ${job.id} 已完成`)
})

notificationWorker.on('failed', async (job, err) => {
  const status: any = get(err, 'statusCode')
  const code: any = get(err, 'code')
  if (([410, 404, 400].includes(status) || code === 'ConnectionRefused') && job?.data) {
    await db
      .update(subscriptions)
      .set({
        deletedAt: new Date(),
      })
      .where(eq(subscriptions.id, job.data.subscription.id))
    logger.info(err, `🚫 订阅 ${job.data.subscription.id} 无效，已从数据库中移除`)
    return
  }
  logger.error(err, `❌ 工作进程 ${notificationWorker.name}: 任务 ${job?.id} 失败`)
})

export default notificationWorker
