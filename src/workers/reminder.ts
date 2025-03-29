import { Job, Worker } from 'bullmq'
import dayjs from 'dayjs'
import { and, eq, isNull } from 'drizzle-orm'
import { QUEUE_NAMES, redisConnection } from '../config/queue'
import { db } from '../db'
import { events } from '../db/schema'
import { notificationsService, remindersService } from '../services'
import type { Reminder } from '../types'
import { logger as _logger } from '../utils/log'

// 创建邮件工作进程处理函数
const processReminderJob = async (job: Job<Reminder>) => {
  const { id, scheduledAt, eventId } = job.data

  const diffInMinutes = Math.abs(dayjs().diff(scheduledAt, 'minutes'))
  if (diffInMinutes > 5) {
    logger.info(`❌ 提醒 ${id} 已过期，跳过处理`)
    return
  }

  logger.info(`⏰ 正在处理事件 ${eventId} 的提醒 ${id}`)

  // Get event details - we already have the event from the reminder object
  // but we can refresh it to make sure we have the latest data
  const freshEvent = await db.query.events.findFirst({
    where: and(eq(events.id, eventId), isNull(events.deletedAt)),
  })

  if (!freshEvent) {
    logger.info(`🚫 事件 ${eventId} 未找到，从活动任务中移除`)
    return
  }

  // Get user subscriptions
  const userSubscriptions = await db.query.subscriptions.findMany({
    where: isNull(events.deletedAt),
  })

  if (userSubscriptions.length === 0) {
    logger.info(`👥 未找到订阅用户，从活动任务中移除`)
    return
  }

  // Send notifications to all subscriptions
  const notificationPromises = userSubscriptions.map(async s => {
    const diff = dayjs(freshEvent.startTime).diff(dayjs(), 'minute')

    const title = [freshEvent.name, (diff <= 1 ? '' : dayjs(freshEvent.startTime).fromNow()) + '即将开始'].join(' - ')
    const body = freshEvent.locations ? freshEvent.locations.join(' - ') : freshEvent.description || ''
    const payload = {
      title,
      body,
    }
    const job = await notificationsService.enqueue(s, payload)
    logger.info(`📬 已为提醒 ${id} 向订阅 ${s.id} 发送通知 ${job.id}`)
  })

  const results = await Promise.allSettled(notificationPromises)
  logger.info(`📊 为提醒 ${id} 成功发送了 ${results.filter(i => i.status === 'fulfilled').length} 条通知`)
}

const reminderWorker = new Worker<Reminder>(QUEUE_NAMES.REMINDER, processReminderJob, {
  connection: redisConnection,
  concurrency: 10,
})

const logger = _logger.child({ worker: ['⏰', reminderWorker.name].join(': ') })

// 监听事件
reminderWorker.on('completed', async (job: Job<Reminder>) => {
  await Promise.all([job.updateProgress(100), remindersService.markAsSent(job.data.id)])

  logger.info(`✨ 提醒 ${job.data.id} 已成功处理`)
})

reminderWorker.on('failed', (job, err) => {
  logger.error(err, `❌ 工作进程 ${reminderWorker.name}: 任务 ${job?.id} 失败`)
})

export default reminderWorker
