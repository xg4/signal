import { zValidator } from '@hono/zod-validator'
import dayjs from 'dayjs'
import { and, eq, gte } from 'drizzle-orm'
import { createInsertSchema } from 'drizzle-zod'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { compact } from 'lodash-es'
import { z } from 'zod'
import { db } from '../db'
import { events, reminders } from '../db/schema'
import { adminRequired } from '../middlewares/auth'
import { schedulesService } from '../services'
import { updateSchedule } from '../services/schedules'
import type { Event, Reminder } from '../types'
import { idValidator } from '../utils/validator'

export const eventInsetSchema = createInsertSchema(events, {
  startTime: z.coerce.date().refine(d => dayjs().isBefore(d)),
  endTime: z.coerce
    .date()
    .refine(d => dayjs().isBefore(d))
    .optional(),
})
  .omit({ id: true, createdAt: true, updatedAt: true })
  .merge(
    z.object({
      reminderTimes: z.number().array().nonempty().optional(),
    }),
  )

export const eventUpdateSchema = eventInsetSchema.partial()

export const eventsHandler = new Hono()

eventsHandler.get('/', async c => {
  const today = dayjs().startOf('day').toDate()

  const allEvents = await db.query.events.findMany({
    where: gte(events.startTime, today),
    with: {
      reminders: true,
    },
    orderBy: (events, { desc }) => [desc(events.startTime)],
  })

  return c.json(allEvents)
})

eventsHandler.get('/:id', zValidator('param', idValidator), async c => {
  const { id } = c.req.valid('param')

  const event = await db.query.events.findFirst({
    where: eq(events.id, id),
    with: {
      reminders: true,
    },
  })

  if (!event) {
    throw new HTTPException(404, { message: '活动不存在或已删除' })
  }

  return c.json(event)
})

function createReminder(e: Event, minutes: number) {
  const scheduledAt = dayjs(e.startTime).subtract(minutes, 'minutes').toDate()
  return {
    eventId: e.id,
    minutesBefore: minutes,
    scheduledAt,
  }
}

eventsHandler.post('/', adminRequired, zValidator('json', eventInsetSchema), async c => {
  const validatedData = c.req.valid('json')

  const existingEvent = await db.query.events.findFirst({
    where: and(eq(events.name, validatedData.name), eq(events.startTime, validatedData.startTime)),
  })

  if (existingEvent) {
    throw new HTTPException(400, { message: '活动已存在' })
  }

  const { reminderTimes, ...eventData } = validatedData

  const newEvent: Event & { reminders?: Reminder[] } = await db.transaction(async tx => {
    const [e] = await tx.insert(events).values(eventData).returning()

    if (!reminderTimes) {
      return e
    }
    const reminderValues = reminderTimes.map(minutes => createReminder(e, minutes))

    const newReminders = await tx.insert(reminders).values(reminderValues).returning()

    return {
      ...e,
      reminders: newReminders,
    }
  })

  if (newEvent.reminders) {
    await schedulesService.updateSchedule()
  }

  return c.json(newEvent, 201)
})

eventsHandler.put(
  '/:id',
  adminRequired,
  zValidator('param', idValidator),
  zValidator('json', eventUpdateSchema),
  async c => {
    const { id } = c.req.valid('param')
    const { reminderTimes, ...updateData } = c.req.valid('json')

    const existingEvent = await db.query.events.findFirst({
      where: eq(events.id, id),
    })

    if (!existingEvent) {
      throw new HTTPException(404, { message: '活动不存在或已删除' })
    }

    const newEvent: Event & { reminders?: Reminder[] } = await db.transaction(async tx => {
      const [updatedEvent] = await tx.update(events).set(updateData).where(eq(events.id, id)).returning()

      if (!reminderTimes) {
        return updatedEvent
      }
      const reminderValues = reminderTimes.map(minutes => createReminder(updatedEvent, minutes))

      await tx.delete(reminders).where(eq(reminders.eventId, id))
      const newReminders = await tx.insert(reminders).values(reminderValues).returning()

      return {
        ...updatedEvent,
        reminders: newReminders,
      }
    })

    if (newEvent.reminders) {
      await schedulesService.updateSchedule()
    }

    return c.json(newEvent)
  },
)

eventsHandler.delete('/:id', adminRequired, zValidator('param', idValidator), async c => {
  const { id } = c.req.valid('param')

  const existingEvent = await db.query.events.findFirst({
    where: eq(events.id, id),
  })

  if (!existingEvent) {
    throw new HTTPException(404, { message: '活动不存在或已删除' })
  }

  await db.delete(reminders).where(eq(reminders.eventId, id))

  await db.delete(events).where(eq(events.id, id))

  await updateSchedule()

  return c.json({ id })
})

eventsHandler.post('/batch', adminRequired, zValidator('json', eventInsetSchema.array().nonempty()), async c => {
  const eventsArray = c.req.valid('json')

  const createdEvents = await Promise.all(
    eventsArray.map(async ({ reminderTimes, ...eventData }) => {
      const existingEvent = await db.query.events.findFirst({
        where: and(eq(events.name, eventData.name), eq(events.startTime, eventData.startTime)),
      })

      if (existingEvent) {
        return null
      }

      const [newEvent] = await db.insert(events).values(eventData).returning()

      if (!reminderTimes) {
        return null
      }

      const reminderValues = reminderTimes.map(m => createReminder(newEvent, m))
      const newReminders = await db.insert(reminders).values(reminderValues).returning()

      return {
        ...newEvent,
        reminders: newReminders,
      }
    }),
  )

  await schedulesService.updateSchedule()

  return c.json(compact(createdEvents), 201)
})
