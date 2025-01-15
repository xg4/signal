import { zValidator } from '@hono/zod-validator'
import { and, eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { z } from 'zod'
import { db } from '../../db/config'
import { events } from '../../db/schema'
import { deleteCronJob, updateSchedule } from '../../services/schedules'

// v2 路由
export const eventsRoute = new Hono()
  .post('/json', async c => {
    try {
      const body = await c.req.parseBody()

      if (!body || !('file' in body)) {
        return c.json({ message: 'No file uploaded' }, 400)
      }

      if (!(body['file'] instanceof File)) {
        return c.json({ message: 'File not found in request body' }, 400)
      }
      const { file } = body

      const fileContent = await file.text()

      const fileSchema = z
        .object({
          name: z.string(),
          description: z.string().optional(),
          dayOfWeek: z.number(),
          startTime: z.string(),
          durationMinutes: z.number(),
          notifyMinutes: z.array(z.number()).optional(),
        })
        .array()
      const jsonData = fileSchema.parse(JSON.parse(fileContent))

      await Promise.all(
        jsonData.map(async e => {
          const [currentEvent] = await db
            .select()
            .from(events)
            .where(and(eq(events.name, e.name), eq(events.dayOfWeek, e.dayOfWeek), eq(events.startTime, e.startTime)))
            .limit(1)
          if (!currentEvent) {
            const [newEvent] = await db.insert(events).values(e).returning()
            newEvent && updateSchedule(newEvent)
          } else {
            const [newEvent] = await db.update(events).set(e).where(eq(events.id, currentEvent.id)).returning()
            newEvent && updateSchedule(newEvent)
          }
        }),
      )

      return c.json({
        message: '更新成功',
      })
    } catch (error: any) {
      console.error('Error parsing file:', error)
      return c.json({ message: `Error processing file: ${error.message}` }, 500)
    }
  })
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
        const [newEvent] = await db.insert(events).values(eventData).returning()
        newEvent && updateSchedule(newEvent)
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
        const [newEvent] = await db.update(events).set(eventData).where(eq(events.id, id)).returning()
        newEvent && updateSchedule(newEvent)
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
      deleteCronJob(id)
      return c.json({ message: '删除成功' }, { status: 200 })
    } catch (error) {
      console.error('删除事件失败:', error)
      return c.json({ error: '删除事件失败' }, { status: 500 })
    }
  })
