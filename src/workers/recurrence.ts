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
  const recurrenceId = job.data.id
  logger.info(`🔍 开始处理循环活动任务 [recurrenceId: ${recurrenceId}, jobId: ${job.id}]`)

  const freshEvent = await prisma.event.findFirst({
    where: {
      recurrenceId,
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
    logger.warn(`🚫 循环活动 [recurrenceId: ${recurrenceId}, jobId: ${job.id}] 未找到或已删除，跳过处理`)
    return
  }

  if (dayjs().isBefore(freshEvent.startTime)) {
    logger.info(
      `🛑 事件 ${freshEvent.id} 的开始时间 ${dayjs(freshEvent.startTime).format('MM-DD HH:mm')} 尚未到来，跳过处理 [recurrenceId: ${recurrenceId}]`,
    )
    return
  }

  // 检查循环规则是否仍然存在
  if (!freshEvent.recurrenceRule) {
    logger.warn(`🚫 事件 ${freshEvent.id} 的循环规则已删除，跳过处理 [recurrenceId: ${recurrenceId}]`)
    return
  }

  // 检查循环结束日期
  if (freshEvent.recurrenceRule.endDate && dayjs().isAfter(freshEvent.recurrenceRule.endDate)) {
    logger.info(
      `🛑 事件 ${freshEvent.id} 的循环已结束 [endDate: ${dayjs(freshEvent.recurrenceRule.endDate).format('MM-DD HH:mm')}]，跳过处理`,
    )
    return
  }

  logger.info(
    `🔄 正在处理循环活动 ${freshEvent.id} [recurrenceId: ${recurrenceId}, type: ${freshEvent.recurrenceRule.type}, interval: ${freshEvent.recurrenceRule.interval}]`,
  )

  const nextTime = getNextTime(
    dayjs(freshEvent.startTime),
    freshEvent.recurrenceRule.type,
    freshEvent.recurrenceRule.interval,
  )
  logger.info(
    `🔄 事件 ${freshEvent.id} 的下一个时间是 ${nextTime.format('MM-DD HH:mm')} [当前时间: ${dayjs().format('MM-DD HH:mm')}]`,
  )

  const newEvent = await eventsService.copy(freshEvent.id, nextTime.toDate())
  logger.info(`✅ 成功创建下一个循环事件 [newEventId: ${newEvent?.id || 'unknown'}, originalEventId: ${freshEvent.id}]`)
}

const recurrenceWorker = new Worker<RecurrenceJob>(QUEUE_NAMES.RECURRENCE, processRecurrenceJob, {
  connection: redisConnection,
  concurrency: 5,
})

const logger = _logger.child({ worker: ['🔄', recurrenceWorker.name].join('_') })

// 监听事件
recurrenceWorker.on('completed', async job => {
  await job.updateProgress(100)
  logger.info(`✅ 循环活动任务 ${job.id} 已成功处理 [recurrenceId: ${job.data.id}]`)
})

recurrenceWorker.on('failed', (job, err) => {
  const jobId = job?.id || 'unknown'
  const recurrenceId = job?.data?.id || 'unknown'
  logger.error(
    { error: err, jobId, recurrenceId },
    `❌ 工作进程 ${recurrenceWorker.name}: 任务 ${jobId} 失败 [recurrenceId: ${recurrenceId}]`,
  )
})

// 添加进程关闭处理
process.on('SIGTERM', async () => {
  logger.info('接收到 SIGTERM 信号，正在关闭 recurrence worker...')
  await recurrenceWorker.close()
  logger.info('Recurrence worker 已安全关闭')
})

export default recurrenceWorker
