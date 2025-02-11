import type { Context } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod'
import { eventService } from '../services'

export const getEvents = async (c: Context) => {
  const allEvents = await eventService.getEvents()
  return c.json(allEvents)
}

export const getEventById = async (c: Context) => {
  const { id } = z.object({ id: z.coerce.number().int() }).parse(c.req.param())

  const event = await eventService.getEventById(id)
  if (!event) {
    throw new HTTPException(404, { message: '活动不存在或已删除' })
  }
  return c.json(event)
}

export const createEventByJSON = async (c: Context) => {
  const jsonData = await eventService.createEventSchema.array().min(1).promise().parse(c.req.json())

  await eventService.importEvents(jsonData)
  return c.json({ message: '更新成功' })
}

export const createEvent = async (c: Context) => {
  const eventData = await eventService.createEventSchema.promise().parse(c.req.json())

  const newEvent = await eventService.createEvent(eventData)
  return c.json(newEvent, { status: 201 })
}

export const updateEvent = async (c: Context) => {
  const { id } = z.object({ id: z.coerce.number().int() }).parse(c.req.param())
  const eventData = await eventService.createEventSchema.promise().parse(c.req.json())

  await eventService.updateEvent(id, eventData)
  return c.json({ message: '更新成功' }, { status: 200 })
}

export const deleteEvent = async (c: Context) => {
  const { id } = z.object({ id: z.coerce.number().int() }).parse(c.req.param())

  await eventService.deleteEvent(id)
  return c.json({ message: '删除成功' }, { status: 200 })
}
