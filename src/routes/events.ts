import { zValidator } from '@hono/zod-validator'
import { eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { z } from 'zod'
import { db } from '../db/config'
import { events } from '../db/schema'
import { getEvents } from '../services/events'

export const eventsRoute = new Hono()
  .get('/', async c => {
    try {
      const allEvents = await getEvents()
      return c.json(allEvents)
    } catch (error) {
      console.error('获取事件失败:', error)
      return c.json({ error: '获取事件失败' }, { status: 500 })
    }
  })
  .get('/:id', zValidator('param', z.object({ id: z.coerce.number().int() })), async c => {
    const { id } = c.req.valid('param')
    const event = await db.select().from(events).where(eq(events.id, id)).limit(1)
    return c.json(event[0])
  })
