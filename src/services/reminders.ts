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

export function clear() {
  return reminderQueue.obliterate({ force: true })
}

export const jobQuerySchema = z.object({
  params: z.object({
    current: z.coerce.number().default(1),
    pageSize: z.coerce.number().default(20),
    name: z.string().trim().optional(),
    id: z.string().trim().optional(),
  }),
})

export function getJob(jobId: string) {
  return reminderQueue.getJob(jobId)
}

export async function getJobs({ params }: z.infer<typeof jobQuerySchema>) {
  const limit = params.pageSize
  const offset = (params.current - 1) * params.pageSize
  const jobs = await reminderQueue.getJobs([])

  const filteredJobs = jobs
    .filter(j => {
      if (params.name) {
        return j.name.includes(params.name)
      }
      if (params.id) {
        return j.id?.includes(params.id)
      }
      return true
    })
    .slice(offset, offset + limit)

  return { data: filteredJobs, total: jobs.length }
}

export async function getStatus(key: string) {
  const job = await reminderQueue.getJob(key)
  if (!job) {
    throw new HTTPException(404, { message: 'Job not found' })
  }
  const state = await job.getState()

  return { ...pick(job, ['id', 'progress', 'attemptsMade', 'timestamp', 'queueName']), state }
}

export function generateJobId(eventId: number, minutes: number) {
  return [eventId, minutes].join('_')
}

export function getScheduledAt(startTime: Date, minutes: number) {
  return dayjs(startTime).subtract(minutes, 'minutes')
}

export function enqueue(e: Event, times: number[]) {
  return Promise.all(
    times.map(m => {
      const scheduledAt = getScheduledAt(e.startTime, m)
      const delay = scheduledAt.diff(dayjs(), 'ms')
      return reminderQueue.add(
        [e.name, dayjs(e.startTime).format('MM-DD HH:mm'), m].join(' - '),
        {
          eventId: e.id,
          scheduledAt: scheduledAt.toDate(),
        },
        {
          delay: Math.max(delay, 1e3),
          jobId: generateJobId(e.id, m),
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
    times.map(m => {
      return reminderQueue.remove(generateJobId(eventId, m))
    }),
  )
}
