import { Job, Worker } from 'bullmq'
import dayjs from 'dayjs'
import { QUEUE_NAMES, redisConnection } from '../config/queue'
import { eventsService } from '../services'
import type { RecurrenceJob } from '../types/queue'
import { logger as _logger } from '../utils/log'
import { prisma } from '../utils/prisma'
import { getNextTime } from '../utils/time'

// 处理循环活动的函数
async function processRecurrenceJob(job: Job<RecurrenceJob>) {
  const freshEvent = await prisma.event.findFirst({
    where: {
      recurrenceId: job.data.id,
      deletedAt: null,
    },
    orderBy: {
      startTime: 'desc',
    },
    include: {
      recurrenceRule: true,
    },
  })

  if (!freshEvent) {
    logger.info(`🚫 活动 ${job.id} 未找到或已删除，跳过处理`)
    return
  }

  if (dayjs().isBefore(freshEvent.startTime)) {
    logger.info(`🛑 事件 ${freshEvent.id} 的开始时间尚未到来，跳过处理`)
    return
  }

  // 检查循环规则是否仍然存在
  if (!freshEvent.recurrenceRule) {
    logger.info(`🚫 事件 ${freshEvent.id} 的循环规则已删除，跳过处理`)
    return
  }

  // 检查循环结束日期
  if (freshEvent.recurrenceRule.endDate && dayjs().isAfter(freshEvent.recurrenceRule.endDate)) {
    logger.info(`🛑 事件 ${freshEvent.id} 的循环已结束，跳过处理`)
    return
  }

  logger.info(`🔄 正在处理循环活动 ${freshEvent.id}`)
  const nextTime = getNextTime(
    dayjs(freshEvent.startTime),
    freshEvent.recurrenceRule.type,
    freshEvent.recurrenceRule.interval,
  )
  logger.info(`🔄 事件 ${freshEvent.id} 的下一个时间是 ${nextTime.format('YYYY-MM-DD HH:mm:ss')}`)

  await eventsService.copy(freshEvent.id, nextTime.toDate())
}

const recurrenceWorker = new Worker<RecurrenceJob>(QUEUE_NAMES.RECURRENCE, processRecurrenceJob, {
  connection: redisConnection,
  concurrency: 5,
})

const logger = _logger.child({ worker: ['🔄', recurrenceWorker.name].join(': ') })

// 监听事件
recurrenceWorker.on('completed', async job => {
  await job.updateProgress(100)

  logger.info(`✅ 循环活动 ${job.id} 已成功处理`)
})

recurrenceWorker.on('failed', (job, err) => {
  logger.error(err, `❌ 工作进程 ${recurrenceWorker.name}: 任务 ${job?.id} 失败`)
})

export default recurrenceWorker
