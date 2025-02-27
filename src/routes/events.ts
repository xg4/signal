import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod'
import { authMiddleware } from '../middlewares'
import { eventService } from '../services'

export const eventRouter = new Hono()

eventRouter.get('/events', async c => {
  const allEvents = await eventService.getEvents()
  return c.json(allEvents)
})

eventRouter.get('/events/:id', zValidator('param', z.object({ id: eventService.eventIdSchema })), async c => {
  const { id } = c.req.valid('param')

  const event = await eventService.getEventById(id)
  if (!event) {
    throw new HTTPException(404, { message: '活动不存在或已删除' })
  }
  return c.json(event)
})

eventRouter.post(
  '/events',
  authMiddleware.adminRequired,
  zValidator('json', eventService.eventInsetSchema),
  async c => {
    const eventData = c.req.valid('json')

    const newEvent = await eventService.createEvent(eventData)
    return c.json(newEvent, { status: 201 })
  },
)

eventRouter.put(
  '/events/:id',
  authMiddleware.adminRequired,
  zValidator('param', z.object({ id: eventService.eventIdSchema })),
  async c => {
    const { id } = c.req.valid('param')
    const eventData = await eventService.eventInsetSchema.promise().parse(c.req.json())

    await eventService.updateEvent(id, eventData)
    return c.json({ message: '更新成功' }, { status: 200 })
  },
)

eventRouter.delete(
  '/events/:id',
  authMiddleware.adminRequired,
  zValidator('param', z.object({ id: eventService.eventIdSchema })),
  async c => {
    const { id } = c.req.valid('param')

    await eventService.deleteEvent(id)
    return c.json({ message: '删除成功' }, { status: 200 })
  },
)

eventRouter.post(
  '/events/json',
  authMiddleware.adminRequired,
  zValidator('json', eventService.eventInsetSchema.array().min(1)),
  async c => {
    const jsonData = c.req.valid('json')

    await eventService.importEvents(jsonData)
    return c.json({ message: '更新成功' })
  },
)
