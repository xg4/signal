import { Job, Worker } from 'bullmq'
import dayjs from 'dayjs'
import { and, eq, isNull } from 'drizzle-orm'
import { QUEUE_NAMES, redisConnection } from '../config/queue'
import { db } from '../db'
import { events } from '../db/schema'
import { eventsService } from '../services'
import type { RecurrenceJob } from '../types'
import { logger as _logger } from '../utils/log'
import { getNextTime } from '../utils/time'

// 处理循环活动的函数
async function processRecurrenceJob(job: Job<RecurrenceJob>) {
  const freshEvent = await db.query.events.findFirst({
    where: and(eq(events.id, job.data.eventId), isNull(events.deletedAt)),
    with: {
      recurrenceRules: true,
    },
  })

  if (!freshEvent) {
    logger.info(`🚫 活动 ${job.data.eventId} 未找到或已删除，跳过处理`)
    return
  }

  if (dayjs().isBefore(freshEvent.startTime)) {
    logger.info(`🛑 事件 ${job.data.eventId} 的开始时间尚未到来，跳过处理`)
    return
  }

  // 检查循环规则是否仍然存在
  if (!freshEvent.recurrenceRules) {
    logger.info(`🚫 事件 ${job.data.eventId} 的循环规则已删除，跳过处理`)
    return
  }

  if (freshEvent.recurrenceRules.id !== job.data.id) {
    logger.info(`🚫 事件 ${job.data.eventId} 的循环规则已更改，跳过处理`)
    return
  }

  // 检查循环结束日期
  if (freshEvent.recurrenceRules.recurrenceEndDate && dayjs().isAfter(freshEvent.recurrenceRules.recurrenceEndDate)) {
    logger.info(`🛑 事件 ${job.data.eventId} 的循环已结束，跳过处理`)
    return
  }

  logger.info(`🔄 正在处理循环活动 ${freshEvent.id}`)
  const nextTime = getNextTime(
    dayjs(freshEvent.startTime),
    freshEvent.recurrenceRules.recurrenceType,
    freshEvent.recurrenceRules.recurrenceInterval,
  )
  logger.info(`🔄 事件 ${freshEvent.id} 的下一个时间是 ${nextTime.format('YYYY-MM-DD HH:mm:ss')}`)

  await eventsService.updateByRecurrence(freshEvent.id, nextTime.toDate())
}

const recurrenceWorker = new Worker<RecurrenceJob>(QUEUE_NAMES.RECURRENCE, processRecurrenceJob, {
  connection: redisConnection,
  concurrency: 5,
})

const logger = _logger.child({ worker: ['🔄', recurrenceWorker.name].join(': ') })

// 监听事件
recurrenceWorker.on('completed', async job => {
  await job.updateProgress(100)

  logger.info(`✅ 循环活动 ${job.data.eventId} 已成功处理`)
})

recurrenceWorker.on('failed', (job, err) => {
  logger.error(err, `❌ 工作进程 ${recurrenceWorker.name}: 任务 ${job?.id} 失败`)
})

export default recurrenceWorker
