import type { Event } from '@prisma/client'
import dayjs from 'dayjs'
import { HTTPException } from 'hono/http-exception'
import { pick } from 'lodash-es'
import { z } from 'zod'
import { reminderQueue } from '../queues/reminder'

export async function getCounts() {
  const counts = await reminderQueue.getJobCounts()

  return counts
}

export const jobQuerySchema = z.object({
  params: z.object({
    current: z.coerce.number().default(1),
    pageSize: z.coerce.number().default(20),
    name: z.string().trim().optional(),
  }),
})

export async function getJobs({ params }: z.infer<typeof jobQuerySchema>) {
  const limit = params.pageSize
  const offset = (params.current - 1) * params.pageSize
  const jobs = await reminderQueue.getJobs([], offset, offset + limit)

  const filteredJobs = jobs.filter(j => {
    if (params.name) {
      return j.name.includes(params.name)
    }
    return true
  })

  return { data: filteredJobs, total: filteredJobs.length }
}

export async function getStatus(key: string) {
  const job = await reminderQueue.getJob(key)
  if (!job) {
    throw new HTTPException(404, { message: 'Job not found' })
  }
  const state = await job.getState()

  return { ...pick(job, ['id', 'progress', 'attemptsMade', 'timestamp', 'queueName']), state }
}

export function enqueue(e: Event, times?: number[]) {
  if (!e.reminderTimes.length) {
    return null
  }
  return Promise.all(
    (times || e.reminderTimes).map(m => {
      const scheduledAt = dayjs(e.startTime).add(m, 'minutes')
      const delay = scheduledAt.diff(dayjs(), 'ms')
      return reminderQueue.add(
        'reminder',
        {
          eventId: e.id,
          scheduledAt: scheduledAt.toDate(),
        },
        {
          delay: Math.max(delay, 1e3),
          jobId: [e.id, m].join('-'),
        },
      )
    }),
  )
}

export async function dequeue(eventId: number, times: number[]) {
  if (!times.length) {
    return null
  }
  return Promise.all(
    times.map(r => {
      const id = [eventId, r].join('-')
      return reminderQueue.remove(id)
    }),
  )
}
