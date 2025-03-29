import dayjs from 'dayjs'
import { eq } from 'drizzle-orm'
import { pick } from 'lodash-es'
import { z } from 'zod'
import { db } from '../db'
import { recurrenceRules } from '../db/schema'
import { recurrenceQueue } from '../queues/recurrence'
import { type Event, type RecurrenceRule, recurrenceRulesInsetSchema } from '../types'

// 添加循环活动到队列
export function enqueue(e: Event, r: RecurrenceRule) {
  let pattern
  const endTime = dayjs(e.startTime).add(e.durationMinutes, 'minutes')
  if (r.recurrenceType === 'daily') {
    pattern = `${endTime.minute()} ${endTime.hour()} * * *`
  }
  if (r.recurrenceType === 'weekly') {
    pattern = `${endTime.minute()} ${endTime.hour()} * * ${endTime.day()}`
  }
  if (r.recurrenceType === 'monthly') {
    pattern = `${endTime.minute()} ${endTime.hour()} ${endTime.date()} * *`
  }

  let endDate
  if (r.recurrenceEndDate) {
    endDate = dayjs(r.recurrenceEndDate).toDate()
    if (dayjs().isAfter(endDate)) {
      return null
    }
  }

  return recurrenceQueue.upsertJobScheduler(
    [r.eventId, r.id].join('-'),
    {
      pattern,
      endDate,
      immediately: true,
    },
    {
      name: 'cron-job',
      data: pick(r, ['eventId', 'id']),
      opts: {},
    },
  )
}

export async function dequeue(r: RecurrenceRule) {
  return recurrenceQueue.removeJobScheduler([r.eventId, r.id].join('-'))
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

export async function create(
  e: Event,
  { recurrenceType, recurrenceEndDate, recurrenceInterval }: z.infer<typeof recurrenceRulesInsetSchema>,
) {
  if (!recurrenceType) {
    return null
  }
  const [result] = await db
    .insert(recurrenceRules)
    .values({
      eventId: e.id,
      recurrenceType,
      recurrenceEndDate,
      recurrenceInterval,
    })
    .returning()
  await enqueue(e, result)
  return result
}

export async function remove(eventId: number) {
  const [result] = await db.delete(recurrenceRules).where(eq(recurrenceRules.eventId, eventId)).returning()
  await dequeue(result)
  return result
}
