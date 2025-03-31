import type { Event } from '@prisma/client'
import dayjs from 'dayjs'
import { HTTPException } from 'hono/http-exception'
import { difference, pick } from 'lodash-es'
import { z } from 'zod'
import { recurrenceService, remindersService } from '.'
import { dateLikeToDate } from '../types'
import { prisma } from '../utils/prisma'

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
  const conditions: any = {}
  if (params.startTime) {
    const [start, end] = params.startTime
    if (start) {
      conditions.startTime.gte = start
    }
    if (end) {
      conditions.startTime.lte = end
    }
  }
  if (params.name) {
    conditions.name.contains = params.name
  }

  conditions.deletedAt = null

  const take = params.pageSize
  const skip = (params.current - 1) * params.pageSize

  const orderBy: any = {}
  if (sort) {
    if (sort.startTime) {
      if (sort.startTime === 'ascend') {
        orderBy.startTime = 'asc'
      } else {
        orderBy.startTime = 'desc'
      }
    }
  }
  orderBy.updatedAt = 'desc'

  const [total, data] = await Promise.all([
    prisma.event.count({
      where: conditions,
    }),
    prisma.event.findMany({
      where: conditions,
      orderBy,
      skip,
      take,
      include: {
        recurrenceRule: true,
      },
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
  const event = await prisma.event.findUnique({
    where: {
      id,
      deletedAt: null,
    },
    include: {
      recurrenceRule: true,
    },
  })

  if (!event) {
    throw new HTTPException(404, { message: '活动不存在或已删除' })
  }

  return event
}

export const eventInsetSchema = z
  .object({
    name: z.string(),
    description: z.string().optional(),
    startTime: dateLikeToDate,
    locations: z.string().array().optional(),
    durationMinutes: z.number().int().optional(),
    reminderTimes: z.number().int().array().optional(),
  })
  .merge(recurrenceService.recurrenceRuleInsetSchema)

/**
 * 创建新事件
 */
export async function create(eventData: z.infer<typeof eventInsetSchema>) {
  const existingEvent = await prisma.event.findFirst({
    where: {
      ...pick(eventData, ['startTime', 'name']),
      deletedAt: null,
    },
  })

  if (existingEvent) {
    throw new HTTPException(400, { message: '活动已存在' })
  }

  const { recurrenceType, recurrenceInterval, recurrenceEndDate, ...values } = eventData

  const newEvent = await prisma.event.create({
    data: values,
  })

  await Promise.all([
    recurrenceType
      ? recurrenceService.create(newEvent, {
          recurrenceEndDate,
          recurrenceInterval,
          recurrenceType,
        })
      : null,
    remindersService.enqueue(newEvent),
  ])

  return prisma.event.findUnique({
    where: {
      id: newEvent.id,
    },
  })
}

/**
 * 更新事件
 */
export async function update(id: number, updateData: z.infer<typeof eventInsetSchema>) {
  const existingEvent = await prisma.event.findUnique({
    where: {
      id,
      deletedAt: null,
    },
    include: {
      recurrenceRule: true,
    },
  })

  if (!existingEvent) {
    throw new HTTPException(404, { message: '活动不存在或已删除' })
  }

  const { recurrenceType, recurrenceInterval, recurrenceEndDate, ...values } = updateData

  const newEvent = await prisma.event.update({
    data: values,
    where: {
      id,
    },
  })

  const updateRule = async () => {
    if (!recurrenceType) {
      if (newEvent.recurrenceId) {
        await recurrenceService.remove(newEvent.recurrenceId)
      }
      return
    }

    if (!newEvent.recurrenceId) {
      return recurrenceService.create(newEvent, {
        recurrenceType,
        recurrenceInterval,
        recurrenceEndDate,
      })
    }

    return recurrenceService.update(newEvent, {
      recurrenceType,
      recurrenceInterval,
      recurrenceEndDate,
    })
  }

  const updateReminder = async () => {
    if (!values.reminderTimes?.length) {
      await remindersService.dequeue(existingEvent.id, existingEvent.reminderTimes)
      return
    }

    if (!existingEvent.reminderTimes.length) {
      await remindersService.enqueue(newEvent)
      return
    }

    if (!dayjs(existingEvent.startTime).isSame(newEvent.startTime, 'minutes')) {
      await remindersService.dequeue(existingEvent.id, existingEvent.reminderTimes)
      return remindersService.enqueue(newEvent)
    }

    const existingMinutes = existingEvent.reminderTimes
    const deleteItems = difference(existingMinutes, values.reminderTimes)
    const addItems = difference(values.reminderTimes, existingMinutes)
    await Promise.all([
      deleteItems.length ? remindersService.dequeue(existingEvent.id, deleteItems) : null,
      addItems.length ? remindersService.enqueue(newEvent, addItems) : null,
    ])
  }

  await Promise.all([updateRule(), updateReminder()])

  return prisma.event.findUnique({
    where: {
      id,
    },
  })
}

/**
 * 删除事件
 */
export async function remove(id: number) {
  const existingEvent = await prisma.event.findUnique({
    where: {
      id,
      deletedAt: null,
    },
  })

  if (!existingEvent) {
    throw new HTTPException(404, { message: '活动不存在或已删除' })
  }

  await prisma.event.update({
    data: {
      deletedAt: new Date(),
    },
    where: {
      id,
    },
  })

  await Promise.all([
    recurrenceService.remove(existingEvent.id),
    remindersService.dequeue(existingEvent.id, existingEvent.reminderTimes),
  ])
}

export const eventBatchInsetSchema = eventInsetSchema.array().nonempty()

/**
 * 批量创建事件
 */
export async function batch(eventsArray: z.infer<typeof eventBatchInsetSchema>) {
  const results = await Promise.allSettled(eventsArray.map(create))
  return results.filter(i => i.status === 'fulfilled').flatMap(i => i.value)
}

export async function copy(event: Event, startTime: Date) {
  const newEvent = await prisma.event.create({
    data: {
      ...event,
      startTime,
    },
  })

  await remindersService.enqueue(newEvent)

  return newEvent
}
