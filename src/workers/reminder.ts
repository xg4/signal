import { Job, Worker } from 'bullmq'
import dayjs from 'dayjs'
import { QUEUE_NAMES, redisConnection } from '../config/queue'
import { notificationsService } from '../services'
import type { ReminderJob } from '../types/queue'
import { logger as _logger } from '../utils/log'
import { prisma } from '../utils/prisma'

// 创建邮件工作进程处理函数
const processReminderJob = async (job: Job<ReminderJob>) => {
  const { scheduledAt, eventId } = job.data

  const diffInMinutes = Math.abs(dayjs().diff(scheduledAt, 'minutes'))
  if (diffInMinutes > 5) {
    logger.info(`❌ 提醒 ${job.id} 已过期，跳过处理 [scheduledAt: ${scheduledAt}, 当前时间差: ${diffInMinutes}分钟]`)
    return
  }

  logger.info(`⏰ 正在处理事件 ${eventId} 的提醒 ${job.id} [scheduledAt: ${scheduledAt}]`)

  // Get event details - we already have the event from the reminder object
  // but we can refresh it to make sure we have the latest data
  const freshEvent = await prisma.event.findUnique({
    where: {
      id: eventId,
      deletedAt: null,
    },
  })

  if (!freshEvent) {
    logger.warn(`🚫 事件 ${eventId} 未找到，从活动任务中移除 [jobId: ${job.id}]`)
    return
  }

  // Get user subscriptions
  const userSubscriptions = await prisma.subscription.findMany({
    where: {
      deletedAt: null,
    },
  })

  if (userSubscriptions.length === 0) {
    logger.warn(`👥 未找到订阅用户，从活动任务中移除 [eventId: ${eventId}, jobId: ${job.id}]`)
    return
  }

  logger.info(`📋 事件 ${eventId} 找到 ${userSubscriptions.length} 个订阅用户`)

  // Send notifications to all subscriptions
  const notificationPromises = userSubscriptions.map(async s => {
    try {
      const diff = dayjs(freshEvent.startTime).diff(dayjs(), 'minute')

      const title = [freshEvent.name, (diff <= 1 ? '' : dayjs(freshEvent.startTime).fromNow()) + '即将开始'].join(' - ')
      const body = freshEvent.locations.length ? freshEvent.locations.join(' - ') : freshEvent.description || ''
      const payload = {
        title,
        body,
      }
      const notificationJob = await notificationsService.enqueue(s, payload)
      logger.info(`📬 已为提醒 ${job.id} 向订阅 ${s.id} 发送通知 [notificationJobId: ${notificationJob.id}]`)
      return { subscriptionId: s.id, success: true }
    } catch (error) {
      logger.error({ error, subscriptionId: s.id }, `❌ 向订阅 ${s.id} 发送通知失败 [jobId: ${job.id}]`)
      return { subscriptionId: s.id, success: false, error }
    }
  })

  const results = await Promise.all(notificationPromises)
  const rejectedCount = results.filter(i => !i.success).length
  const fulfilledCount = results.filter(i => i.success).length

  logger.info(`📊 提醒 ${job.id} 处理结果: 成功=${fulfilledCount}, 失败=${rejectedCount}, 总计=${results.length}`)
}

const reminderWorker = new Worker<ReminderJob>(QUEUE_NAMES.REMINDER, processReminderJob, {
  connection: redisConnection,
  concurrency: 10,
})

const logger = _logger.child({ worker: ['⏰', reminderWorker.name].join('_') })

// 监听事件
reminderWorker.on('completed', async (job: Job<ReminderJob>) => {
  await job.updateProgress(100)
  logger.info(`✨ 提醒 ${job.id} 已成功处理 [eventId: ${job.data.eventId}]`)
})

reminderWorker.on('failed', (job, err) => {
  const jobId = job?.id || 'unknown'
  const eventId = job?.data?.eventId || 'unknown'
  logger.error(
    { error: err, jobId, eventId },
    `❌ 工作进程 ${reminderWorker.name}: 任务 ${jobId} 失败 [eventId: ${eventId}]`,
  )
})

// 添加进程关闭处理
process.on('SIGTERM', async () => {
  logger.info('接收到 SIGTERM 信号，正在关闭 reminder worker...')
  await reminderWorker.close()
  logger.info('Reminder worker 已安全关闭')
})

export default reminderWorker
