import { RecurrenceType, type Event, type RecurrenceRule } from '@prisma/client'
import dayjs from 'dayjs'
import { pick } from 'lodash-es'
import { z } from 'zod'
import { recurrenceQueue } from '../queues/recurrence'
import { dateLikeToDate, recurrenceTypeSchema } from '../types'
import { prisma } from '../utils/prisma'

// 添加循环活动到队列
export async function enqueue(e: Event, r: RecurrenceRule) {
  let pattern
  const endTime = dayjs(e.startTime).add(e.durationMinutes, 'minutes')
  if (r.type === RecurrenceType.DAILY) {
    pattern = `${endTime.minute()} ${endTime.hour()} * * *`
  }
  if (r.type === RecurrenceType.WEEKLY) {
    pattern = `${endTime.minute()} ${endTime.hour()} * * ${endTime.day()}`
  }
  if (r.type === RecurrenceType.MONTHLY) {
    pattern = `${endTime.minute()} ${endTime.hour()} ${endTime.date()} * *`
  }

  let endDate
  if (r.endDate) {
    endDate = dayjs(r.endDate).toDate()
    if (dayjs().isAfter(endDate)) {
      return null
    }
  }
  const jobSchedulerId = [r.id].join('-')

  return recurrenceQueue.upsertJobScheduler(
    jobSchedulerId,
    {
      pattern,
      endDate,
      immediately: true,
    },
    {
      name: 'cron-job',
      data: pick(r, ['id']),
      opts: {},
    },
  )
}

export async function dequeue(id: number) {
  return recurrenceQueue.removeJobScheduler([id].join('-'))
}

export const jobQuerySchema = z.object({
  params: z.object({
    current: z.coerce.number().default(1),
    pageSize: z.coerce.number().default(20),
    repeatJobKey: z.string().trim().optional(),
  }),
})

export async function getJobs({ params }: z.infer<typeof jobQuerySchema>) {
  const limit = params.pageSize
  const offset = (params.current - 1) * params.pageSize
  const jobs = await recurrenceQueue.getJobs([], offset, offset + limit)

  const filteredJobs = jobs.filter(j => {
    if (params.repeatJobKey) {
      return j.repeatJobKey?.includes(params.repeatJobKey)
    }
    return true
  })

  return {
    data: filteredJobs,
    total: filteredJobs.length,
  }
}

export async function getStatus(key: string) {
  const job = await recurrenceQueue.getJobScheduler(key)
  return pick(job, ['id', 'name', 'pattern', 'next', 'endDate'])
}

export const recurrenceRuleInsetSchema = z.object({
  recurrenceType: recurrenceTypeSchema.optional(),
  recurrenceInterval: z.coerce.number().default(1),
  recurrenceEndDate: dateLikeToDate.optional().nullable(),
})

export async function create(
  e: Event,
  { recurrenceType, recurrenceEndDate, recurrenceInterval }: z.infer<typeof recurrenceRuleInsetSchema>,
) {
  if (!recurrenceType) {
    return null
  }
  const result = await prisma.recurrenceRule.create({
    data: {
      type: recurrenceType,
      endDate: recurrenceEndDate,
      interval: recurrenceInterval,
    },
  })

  await Promise.all([
    prisma.event.update({
      where: {
        id: e.id,
      },
      data: {
        recurrenceId: result.id,
      },
    }),
    enqueue(e, result),
  ])
  return result
}

export async function update(
  e: Event,
  { recurrenceType, recurrenceEndDate, recurrenceInterval }: z.infer<typeof recurrenceRuleInsetSchema>,
) {
  if (!recurrenceType || !e.recurrenceId) {
    return null
  }
  const result = await prisma.recurrenceRule.update({
    where: {
      id: e.recurrenceId,
    },
    data: {
      type: recurrenceType,
      endDate: recurrenceEndDate,
      interval: recurrenceInterval,
    },
  })
  await enqueue(e, result)
  return result
}

export async function remove(id: number) {
  const result = await prisma.recurrenceRule.delete({
    where: {
      id,
    },
  })
  await dequeue(id)
  return result
}
