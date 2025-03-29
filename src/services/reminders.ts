import dayjs from 'dayjs'
import { and, eq, inArray, isNull } from 'drizzle-orm'
import { HTTPException } from 'hono/http-exception'
import { pick } from 'lodash-es'
import { z } from 'zod'
import { db } from '../db'
import { reminders } from '../db/schema'
import { reminderQueue } from '../queues/reminder'
import { type Event, type Reminder } from '../types'

export async function markAsSent(reminderId: number) {
  return db.update(reminders).set({ sent: true }).where(eq(reminders.id, reminderId))
}

export async function create(e: Event, minutes: number[]) {
  const newReminders = await Promise.all(
    minutes.map(async m => {
      const scheduledAt = dayjs(e.startTime).subtract(m, 'minutes').toDate()

      const existingReminder = await db.query.reminders.findFirst({
        where: and(eq(reminders.eventId, e.id), eq(reminders.scheduledAt, scheduledAt), isNull(reminders.deletedAt)),
      })
      if (existingReminder) {
        return existingReminder
      }
      const [newReminder] = await db
        .insert(reminders)
        .values({
          eventId: e.id,
          minutesBefore: m,
          scheduledAt,
        })
        .returning()

      return newReminder
    }),
  )

  await Promise.all(newReminders.map(enqueue))

  return newReminders
}

export async function remove(eventId: number, minutes?: number[]) {
  const conditions = [eq(reminders.eventId, eventId)]
  if (minutes) {
    conditions.push(inArray(reminders.minutesBefore, minutes))
  }
  const list = await db
    .delete(reminders)
    .where(and(...conditions))
    .returning()
  await Promise.all(list.map(dequeue))
  return list
}

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

export async function getByEventId(eventId: number) {
  return db.query.reminders.findMany({
    where: and(eq(reminders.eventId, eventId), isNull(reminders.deletedAt)),
  })
}

export function enqueue(reminder: Reminder) {
  const delay = dayjs(reminder.scheduledAt).diff(dayjs(), 'ms')
  return reminderQueue.add('reminder', reminder, {
    delay: Math.max(delay, 0),
    jobId: [reminder.eventId, reminder.id].join('-'),
  })
}

export async function dequeue(reminder: Reminder) {
  const id = [reminder.eventId, reminder.id].join('-')
  return reminderQueue.remove(id)
}
