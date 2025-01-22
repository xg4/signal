import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod'
import { getEventById, getEvents } from '../services/events'

export const eventsRoute = new Hono()
  .get('/', async c => {
    const allEvents = await getEvents()
    return c.json(allEvents)
  })
  .get('/:id', zValidator('param', z.object({ id: z.coerce.number().int() })), async c => {
    const { id } = c.req.valid('param')

    const event = await getEventById(id)
    if (!event) {
      throw new HTTPException(404, { message: '活动不存在或已删除' })
    }
    return c.json(event)
  })
