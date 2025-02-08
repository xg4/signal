import dayjs from 'dayjs'
import { and, eq } from 'drizzle-orm'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod'
import { scheduleService } from '.'
import { db } from '../db/config'
import { events } from '../db/schema'

export const createEventSchema = z.object({
  name: z.string({
    message: '无效的活动名称',
  }),
  description: z.string().optional().nullable(),
  dayOfWeek: z.number().min(0).max(6),
  startTime: z.string({
    message: '无效的开始时间',
  }),
  durationMinutes: z.number().default(10),
  notifyMinutes: z.array(z.number()).optional(),
  locations: z.array(z.string()).optional(),
})

export function setDayOfWeek(dayOfWeek: number) {
  const now = dayjs()
  const currentDayOfWeek = now.day()
  const diff = (dayOfWeek || 7) - (currentDayOfWeek || 7)
  return now.add(diff, 'day')
}

export function getEventDate(event: { dayOfWeek: number; startTime: string }) {
  const day = setDayOfWeek(event.dayOfWeek)
  return dayjs.tz(`${day.format('YYYY-MM-DD')} ${event.startTime}`, 'Asia/Shanghai')
}

export async function getEvents() {
  return db.select().from(events).orderBy(events.id)
}

export async function getEventById(id: number) {
  const [event] = await db.select().from(events).where(eq(events.id, id)).limit(1)
  return event
}

export async function createEvent(eventData: z.infer<typeof createEventSchema>) {
  const [currentEvent] = await db
    .select()
    .from(events)
    .where(
      and(
        eq(events.name, eventData.name),
        eq(events.dayOfWeek, eventData.dayOfWeek),
        eq(events.startTime, eventData.startTime),
      ),
    )
    .limit(1)
  if (currentEvent) {
    throw new HTTPException(400, { message: '活动已存在' })
  }
  const [newEvent] = await db.insert(events).values(eventData).returning()
  if (newEvent) {
    scheduleService.updateSchedule(newEvent)
  }
  return newEvent
}

export async function updateEvent(id: number, eventData: z.infer<typeof createEventSchema>) {
  const [existingEvent] = await db.select().from(events).where(eq(events.id, id)).limit(1)

  if (!existingEvent) {
    throw new HTTPException(404, { message: '活动不存在或已删除' })
  }

  const [updatedEvent] = await db.update(events).set(eventData).where(eq(events.id, id)).returning()

  if (updatedEvent) {
    scheduleService.updateSchedule(updatedEvent)
  }
  return updatedEvent
}

export async function deleteEvent(id: number) {
  const [existingEvent] = await db.select().from(events).where(eq(events.id, id)).limit(1)

  if (!existingEvent) {
    throw new HTTPException(404, { message: '活动不存在或已删除' })
  }

  await db.delete(events).where(eq(events.id, id))

  scheduleService.deleteCronJob(id)
}

export async function importEvents(jsonData: z.infer<typeof createEventSchema>[]) {
  const tasks = await Promise.allSettled(
    jsonData.map(async e => {
      const [currentEvent] = await db
        .select()
        .from(events)
        .where(and(eq(events.name, e.name), eq(events.dayOfWeek, e.dayOfWeek), eq(events.startTime, e.startTime)))
        .limit(1)

      if (!currentEvent) {
        return createEvent(e)
      }
      return updateEvent(currentEvent.id, e)
    }),
  )

  const errors = tasks.filter(t => t.status === 'rejected').map(i => i.reason)
  if (errors.length) {
    console.log('🚀 ~ importEvents ~ error:', ...errors)
  }

  console.log(
    '🚀 ~ importEvents ~ all:',
    jsonData.length,
    'success:',
    tasks.filter(t => t.status === 'fulfilled').length,
  )
}
