import dayjs from 'dayjs'
import { and, asc, count, desc, eq, gte, isNull, like, lte } from 'drizzle-orm'
import { HTTPException } from 'hono/http-exception'
import { difference, differenceBy } from 'lodash-es'
import { z } from 'zod'
import { recurrenceService, remindersService } from '.'
import { db } from '../db'
import { events, reminders } from '../db/schema'
import { eventBatchInsetSchema, eventInsetSchema } from '../types'
import { isSameDate } from '../utils/time'

export const sortOrder = z.enum(['ascend', 'descend'])

export const eventQuerySchema = z.object({
  params: z.object({
    startTime: z.coerce.date().array().optional(),
    pageSize: z.coerce.number().default(20),
    current: z.coerce.number().default(1),
    name: z.string().optional(),
  }),
  sort: z
    .object({
      startTime: sortOrder,
    })
    .partial()
    .optional(),
})

/**
 * 获取指定时间范围内的所有事件
 */
export async function query({ params, sort }: z.infer<typeof eventQuerySchema>) {
  const conditions = []
  if (params.startTime) {
    const [start, end] = params.startTime
    if (start) {
      conditions.push(gte(events.startTime, start))
    }
    if (end) {
      conditions.push(lte(events.startTime, end))
    }
  }
  if (params.name) {
    conditions.push(like(events.name, `%${params.name}%`))
  }

  conditions.push(isNull(events.deletedAt))

  const limit = params.pageSize
  const offset = (params.current - 1) * params.pageSize

  let orderBy = []
  if (sort) {
    if (sort.startTime) {
      if (sort.startTime === 'ascend') {
        orderBy.push(asc(events.startTime))
      } else {
        orderBy.push(desc(events.startTime))
      }
    }
  }
  orderBy.push(desc(events.updatedAt))

  const [[{ total }], data] = await Promise.all([
    db
      .select({
        total: count(),
      })
      .from(events)
      .where(and(...conditions)),
    db.query.events.findMany({
      where: and(...conditions),
      with: {
        reminders: {
          where: (r, { isNull }) => isNull(r.deletedAt),
          orderBy: (r, { asc }) => asc(r.scheduledAt),
        },
        recurrenceRules: true,
      },
      limit,
      offset,
      orderBy,
    }),
  ])

  return {
    data,
    total,
  }
}

/**
 * 根据ID获取事件
 */
export async function getEventById(id: number) {
  const event = await db.query.events.findFirst({
    where: and(eq(events.id, id), isNull(events.deletedAt)),
    with: {
      reminders: {
        where: isNull(reminders.deletedAt),
      },
      recurrenceRules: true,
    },
  })

  if (!event) {
    throw new HTTPException(404, { message: '活动不存在或已删除' })
  }

  return event
}

/**
 * 创建新事件
 */
export async function add(eventData: z.infer<typeof eventInsetSchema>) {
  const existingEvent = await db.query.events.findFirst({
    where: and(eq(events.startTime, eventData.startTime), eq(events.name, eventData.name), isNull(events.deletedAt)),
  })

  if (existingEvent) {
    throw new HTTPException(400, { message: '活动已存在' })
  }

  // 提取 recurrenceType 和相关字段
  const { recurrenceType, recurrenceInterval, recurrenceEndDate, reminderTimes, ...eventValues } = eventData

  // 创建事件
  const [newEvent] = await db.insert(events).values(eventValues).returning()

  const [newRule, newReminders] = await Promise.all([
    recurrenceType
      ? recurrenceService.create(newEvent, {
          recurrenceType,
          recurrenceInterval,
          recurrenceEndDate,
        })
      : null,
    reminderTimes?.length ? remindersService.create(newEvent, reminderTimes) : null,
  ])

  return {
    ...newEvent,
    recurrenceRules: newRule,
    reminders: newReminders,
  }
}

/**
 * 更新事件
 */
export async function update(id: number, updateData: z.infer<typeof eventInsetSchema>) {
  const existingEvent = await db.query.events.findFirst({
    where: and(eq(events.id, id), isNull(events.deletedAt)),
    with: {
      reminders: {
        where: isNull(reminders.deletedAt),
      },
      recurrenceRules: true,
    },
  })

  if (!existingEvent) {
    throw new HTTPException(404, { message: '活动不存在或已删除' })
  }

  // 提取 reminderTimes 和相关字段
  const { reminderTimes, recurrenceType, recurrenceInterval, recurrenceEndDate, ...eventValues } = updateData

  // 更新事件
  const [newEvent] = await db.update(events).set(eventValues).where(eq(events.id, id)).returning()

  const updateRule = async () => {
    if (!recurrenceType) {
      await recurrenceService.remove(newEvent.id)
      return null
    }

    if (!existingEvent.recurrenceRules) {
      return recurrenceService.create(newEvent, {
        recurrenceType,
        recurrenceInterval,
        recurrenceEndDate,
      })
    }

    if (
      existingEvent.recurrenceRules &&
      existingEvent.durationMinutes === newEvent.durationMinutes &&
      dayjs(existingEvent.startTime).isSame(newEvent.startTime, 'minutes') &&
      recurrenceType === existingEvent.recurrenceRules.recurrenceType &&
      recurrenceInterval === existingEvent.recurrenceRules.recurrenceInterval &&
      isSameDate(recurrenceEndDate, existingEvent.recurrenceRules.recurrenceEndDate)
    ) {
      return existingEvent.recurrenceRules
    }

    await recurrenceService.remove(newEvent.id)
    return recurrenceService.create(newEvent, {
      recurrenceType,
      recurrenceInterval,
      recurrenceEndDate,
    })
  }

  const updateReminder = async () => {
    if (!reminderTimes) {
      await remindersService.remove(existingEvent.id)
      return null
    }

    if (!existingEvent.reminders.length) {
      return remindersService.create(newEvent, reminderTimes)
    }

    if (!dayjs(existingEvent.startTime).isSame(newEvent.startTime, 'minutes')) {
      await remindersService.remove(existingEvent.id)
      return remindersService.create(newEvent, reminderTimes)
    }

    const existingMinutes = existingEvent.reminders.map(i => i.minutesBefore)
    const deleteItems = difference(existingMinutes, reminderTimes)
    const addItems = difference(reminderTimes, existingMinutes)
    const [deleted, added] = await Promise.all([
      deleteItems.length ? remindersService.remove(existingEvent.id, deleteItems) : [],
      addItems.length ? remindersService.create(newEvent, addItems) : [],
    ])

    return [...differenceBy(existingEvent.reminders, deleted, 'id'), ...added]
  }

  const [newRule, newReminders] = await Promise.all([updateRule(), updateReminder()])

  return {
    ...newEvent,
    recurrenceRules: newRule,
    reminders: newReminders,
  }
}

/**
 * 删除事件
 */
export async function remove(id: number) {
  const existingEvent = await db.query.events.findFirst({
    where: and(eq(events.id, id), isNull(events.deletedAt)),
    with: {
      reminders: {
        where: isNull(reminders.deletedAt),
      },
    },
  })

  if (!existingEvent) {
    throw new HTTPException(404, { message: '活动不存在或已删除' })
  }

  // 逻辑删除事件，设置 deletedAt 字段为当前时间
  await db.update(events).set({ deletedAt: new Date() }).where(eq(events.id, existingEvent.id))

  await Promise.all([recurrenceService.remove(existingEvent.id), remindersService.remove(existingEvent.id)])
}

/**
 * 批量创建事件
 */
export async function batch(eventsArray: z.infer<typeof eventBatchInsetSchema>) {
  const results = await Promise.allSettled(eventsArray.map(add))
  return results.filter(i => i.status === 'fulfilled').flatMap(i => i.value)
}

export async function updateByRecurrence(eventId: number, nextTime: Date) {
  const [newEvent] = await db
    .update(events)
    .set({
      startTime: nextTime,
    })
    .where(eq(events.id, eventId))
    .returning()

  const existingReminders = await remindersService.getByEventId(newEvent.id)
  if (!existingReminders.length) {
    return
  }
  await remindersService.remove(newEvent.id)
  const reminderTimes = existingReminders.map(i => i.minutesBefore)
  await remindersService.create(newEvent, reminderTimes)
}
