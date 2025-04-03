import { Job, Worker } from 'bullmq'
import { get } from 'lodash-es'
import { QUEUE_NAMES, redisConnection } from '../config/queue'
import type { NotificationJob } from '../types/queue'
import { logger as _logger } from '../utils/log'
import { prisma } from '../utils/prisma'
import { sendNotification } from '../utils/push'

// 创建邮件工作进程处理函数
async function processNotificationJob(job: Job<NotificationJob>) {
  const { subscription, payload } = job.data
  logger.info(`🔔 正在处理通知任务 ${job.id} [subscriptionId: ${subscription.id}]`)

  await sendNotification(subscription, payload)
  logger.info(`📤 通知发送成功 [jobId: ${job.id}, subscriptionId: ${subscription.id}]`)
}

const notificationWorker = new Worker<NotificationJob>(QUEUE_NAMES.NOTIFICATION, processNotificationJob, {
  connection: redisConnection,
  concurrency: 20,
})

const logger = _logger.child({ worker: ['✉️', notificationWorker.name].join(': ') })

// 监听事件
notificationWorker.on('completed', async (job: Job<NotificationJob>) => {
  await job.updateProgress(100)
  logger.info(`✅ 通知任务 ${job.id} 已完成 [subscriptionId: ${job.data.subscription.id}]`)
})

notificationWorker.on('failed', async (job, err) => {
  if (!job?.data) {
    logger.error({ error: err }, `❌ 通知任务失败，无任务数据 [jobId: ${job?.id || 'unknown'}]`)
    return
  }

  const subscriptionId = job.data.subscription.id
  const status: any = get(err, 'statusCode')
  const code: any = get(err, 'code')

  if ([410, 404, 400].includes(status) || code === 'ConnectionRefused') {
    try {
      await prisma.subscription.update({
        where: {
          id: subscriptionId,
        },
        data: {
          deletedAt: new Date(),
        },
      })
      logger.warn(
        { error: err, subscriptionId, status, code },
        `🚫 订阅 ${subscriptionId} 无效，已从数据库中移除 [status: ${status}, code: ${code}]`,
      )
    } catch (dbError) {
      logger.error(
        { error: dbError, originalError: err, subscriptionId },
        `❌ 移除无效订阅失败 [subscriptionId: ${subscriptionId}]`,
      )
    }
    return
  }

  logger.error(
    { error: err, jobId: job.id, subscriptionId },
    `❌ 通知任务 ${job.id} 失败 [subscriptionId: ${subscriptionId}]`,
  )
})

// 添加进程关闭处理
process.on('SIGTERM', async () => {
  logger.info('接收到 SIGTERM 信号，正在关闭 notification worker...')
  await notificationWorker.close()
  logger.info('Notification worker 已安全关闭')
})

export default notificationWorker
