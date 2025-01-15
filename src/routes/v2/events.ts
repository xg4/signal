import { zValidator } from '@hono/zod-validator'
import { eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { z } from 'zod'
import { db } from '../../db/config'
import { events } from '../../db/schema'
import { updateSchedule } from '../../services/schedules'

// v2 路由
export const eventsRoute = new Hono()
  .post(
    '/',
    zValidator(
      'json',
      z.object({
        name: z.string(),
        description: z.string(),
        dayOfWeek: z.number(),
        startTime: z.string(),
        durationMinutes: z.number(),
        notifyMinutes: z.array(z.number()),
      }),
    ),
    async c => {
      try {
        const eventData = c.req.valid('json')
        const newEvent = await db.insert(events).values(eventData).returning()
        return c.json(newEvent, { status: 201 })
      } catch (error) {
        console.error('创建事件失败:', error)
        return c.json({ error: '创建事件失败' }, { status: 500 })
      }
    },
  )
  .put(
    '/:id',
    zValidator(
      'json',
      z.object({
        name: z.string(),
        description: z.string(),
        dayOfWeek: z.number(),
        startTime: z.string(),
        durationMinutes: z.number(),
        notifyMinutes: z.array(z.number()),
      }),
    ),
    zValidator('param', z.object({ id: z.coerce.number().int() })),
    async c => {
      try {
        const { id } = c.req.valid('param')
        const eventData = c.req.valid('json')
        const newEvent = await db.update(events).set(eventData).where(eq(events.id, id)).returning()
        const eventItem = newEvent[0]
        eventItem && updateSchedule(eventItem)
        return c.json({ message: '更新成功' }, { status: 200 })
      } catch (error) {
        console.error('更新事件失败:', error)
        return c.json({ error: '更新事件失败' }, { status: 500 })
      }
    },
  )
  .delete('/:id', zValidator('param', z.object({ id: z.coerce.number().int() })), async c => {
    try {
      const { id } = c.req.valid('param')
      await db.delete(events).where(eq(events.id, id))
      return c.json({ message: '删除成功' }, { status: 200 })
    } catch (error) {
      console.error('删除事件失败:', error)
      return c.json({ error: '删除事件失败' }, { status: 500 })
    }
  })
