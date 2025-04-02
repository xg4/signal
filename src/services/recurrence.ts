import { RecurrenceType, type Event, type RecurrenceRule } from '@prisma/client'
import dayjs from 'dayjs'
import { pick } from 'lodash-es'
import { z } from 'zod'
import type { eventsService } from '.'
import { recurrenceQueue } from '../queues/recurrence'
import { prisma } from '../utils/prisma'

export function clear() {
  return recurrenceQueue.obliterate({
    force: true,
  })
}

export function generateSchedulerId(recurrenceId: number) {
  return ['scheduler', recurrenceId].join('_')
}

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

  return recurrenceQueue.upsertJobScheduler(
    generateSchedulerId(r.id),
    {
      pattern,
      endDate,
      immediately: true,
    },
    {
      name: [e.name, endTime.format('MM-DD HH:mm'), r.type].join(' - '),
      data: pick(r, ['id']),
      opts: {},
    },
  )
}

export async function dequeue(recurrenceId: number) {
  return recurrenceQueue.removeJobScheduler(generateSchedulerId(recurrenceId))
}

export const jobQuerySchema = z.object({
  params: z.object({
    current: z.coerce.number().default(1),
    pageSize: z.coerce.number().default(20),

    repeatJobKey: z.string().trim().optional(),
    id: z.string().trim().optional(),
    name: z.string().trim().optional(),
  }),
})

export async function getJobs({ params }: z.infer<typeof jobQuerySchema>) {
  const limit = params.pageSize
  const offset = (params.current - 1) * params.pageSize
  const jobs = await recurrenceQueue.getJobs([])

  const filteredJobs = jobs
    .filter(j => {
      if (params.repeatJobKey) {
        return j.repeatJobKey?.includes(params.repeatJobKey)
      }
      if (params.id) {
        return j.id?.includes(params.id)
      }
      if (params.name) {
        return j.name?.includes(params.name)
      }
      return true
    })
    .slice(offset, offset + limit)

  return {
    data: filteredJobs,
    total: jobs.length,
  }
}

export async function getJobScheduler(key: string) {
  const job = await recurrenceQueue.getJobScheduler(key)
  return pick(job, ['id', 'name', 'pattern', 'next', 'endDate'])
}

export async function create(e: Event, rule: z.infer<typeof eventsService.recurrenceRuleInsetSchema>) {
  const result = await prisma.recurrenceRule.create({
    data: rule,
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
  id: number,
  { event, rule }: { event: Event; rule: z.infer<typeof eventsService.recurrenceRuleInsetSchema> },
) {
  const result = await prisma.recurrenceRule.update({
    where: {
      id,
    },
    data: rule,
  })
  await enqueue(event, result)
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
