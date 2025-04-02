import type { Prisma } from '@prisma/client'
import dayjs from 'dayjs'
import { HTTPException } from 'hono/http-exception'
import { difference, omit, pick } from 'lodash-es'
import { z } from 'zod'
import { recurrenceService, remindersService } from '.'
import { dateLikeToDate, recurrenceTypeSchema } from '../types'
import { prisma } from '../utils/prisma'

export const sortOrder = z.enum(['ascend', 'descend'])

export const eventParamsSchema = z.object({
  pageSize: z.coerce.number().default(20),
  current: z.coerce.number().default(1),
  name: z.string().trim().optional(),
  startTime: z.coerce.date().array().optional(),
})

export const eventQuerySchema = z.object({
  params: eventParamsSchema,
  sort: z
    .object({
      startTime: sortOrder,
    })
    .partial()
    .optional(),
})

export async function init() {
  await Promise.all([remindersService.clear(), recurrenceService.clear()])

  const events = await prisma.event.findMany({
    where: {
      startTime: {
        gte: new Date(),
      },
      deletedAt: null,
    },
  })

  await Promise.all(
    events.map(async e => {
      if (e.reminderTimes.length) {
        await remindersService.enqueue(e, e.reminderTimes)
      }
    }),
  )

  const rules = await prisma.recurrenceRule.findMany({
    include: {
      events: {
        orderBy: {
          startTime: 'desc',
        },
      },
    },
  })
  await Promise.all(
    rules.map(async r => {
      const [e] = r.events
      await recurrenceService.enqueue(e, r)
    }),
  )
}

export async function getCount(params: z.infer<typeof eventParamsSchema>) {
  const conditions = generateConditions(params)

  return prisma.event.count({
    where: conditions,
  })
}

function generateConditions(params: z.infer<typeof eventParamsSchema>) {
  const [gte, lte] = params.startTime || []
  const conditions: Prisma.EventWhereInput = {
    startTime: {
      gte,
      lte,
    },
    name: {
      startsWith: params.name,
    },
    deletedAt: null,
  }

  return conditions
}

/**
 * 获取指定时间范围内的所有事件
 */
export async function query({ params, sort }: z.infer<typeof eventQuerySchema>) {
  const conditions = generateConditions(params)

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

  return prisma.event.findMany({
    where: conditions,
    orderBy,
    skip,
    take,
    include: {
      recurrenceRule: true,
    },
  })
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

export const recurrenceRuleInsetSchema = z.object({
  type: recurrenceTypeSchema,
  interval: z.coerce.number().default(1),
  endDate: dateLikeToDate.optional().nullable(),
})

export const eventInsetSchema = z
  .object({
    name: z.string(),
    description: z.string().optional(),
    startTime: dateLikeToDate,
    locations: z.string().array().optional(),
    durationMinutes: z.coerce.number().int().optional(),
    reminderTimes: z.coerce.number().int().array().optional(),
  })
  .merge(
    z.object({
      recurrenceRule: recurrenceRuleInsetSchema.optional(),
    }),
  )

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

  const { recurrenceRule, ...values } = eventData

  const newEvent = await prisma.event.create({
    data: values,
  })

  await Promise.all([
    recurrenceRule ? recurrenceService.create(newEvent, recurrenceRule) : null,
    newEvent.reminderTimes.length ? remindersService.enqueue(newEvent, newEvent.reminderTimes) : null,
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

  const { recurrenceRule, ...values } = updateData

  const newEvent = await prisma.event.update({
    data: values,
    where: {
      id,
    },
  })

  const updateRule = async () => {
    if (!recurrenceRule) {
      if (newEvent.recurrenceId) {
        await recurrenceService.remove(newEvent.recurrenceId)
      }
      return
    }

    if (!newEvent.recurrenceId) {
      return recurrenceService.create(newEvent, recurrenceRule)
    }

    return recurrenceService.update(newEvent.recurrenceId, { event: newEvent, rule: recurrenceRule })
  }

  const updateReminder = async () => {
    if (!newEvent.reminderTimes.length) {
      await remindersService.dequeue(existingEvent.id, existingEvent.reminderTimes)
      return
    }

    if (!existingEvent.reminderTimes.length) {
      await remindersService.enqueue(newEvent, newEvent.reminderTimes)
      return
    }

    if (!dayjs(existingEvent.startTime).isSame(newEvent.startTime, 'minutes')) {
      await remindersService.dequeue(existingEvent.id, existingEvent.reminderTimes)
      return remindersService.enqueue(newEvent, newEvent.reminderTimes)
    }

    const existingMinutes = existingEvent.reminderTimes
    const deleteItems = difference(existingMinutes, newEvent.reminderTimes)
    const addItems = difference(newEvent.reminderTimes, existingMinutes)
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
    existingEvent.recurrenceId && recurrenceService.remove(existingEvent.recurrenceId),
    existingEvent.reminderTimes.length && remindersService.dequeue(existingEvent.id, existingEvent.reminderTimes),
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

export async function copy(eventId: number, startTime: Date) {
  const existingEvent = await prisma.event.findUnique({
    where: {
      id: eventId,
    },
  })
  if (!existingEvent) {
    return null
  }
  const newEvent = await prisma.event.create({
    data: {
      ...omit(existingEvent, ['id', 'createdAt', 'updatedAt', 'deletedAt']),
      startTime,
    },
  })

  await remindersService.enqueue(newEvent, newEvent.reminderTimes)

  return newEvent
}
