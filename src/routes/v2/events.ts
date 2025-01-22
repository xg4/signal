import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'
import { createEvent, deleteEvent, importEvents, updateEvent } from '../../services/events'

export const createEventSchema = z.object({
  name: z.string(),
  description: z.string().optional().nullable(),
  dayOfWeek: z.number(),
  startTime: z.string(),
  durationMinutes: z.number(),
  notifyMinutes: z.array(z.number()).optional(),
  locations: z.array(z.string()).optional(),
})

const fileSchema = z.object({
  file: z.instanceof(File),
})

// v2 路由
export const eventsRouteV2 = new Hono()
  .post('/json', async c => {
    const { file } = await c.req.parseBody().then(fileSchema.parse)

    const content = await file.text().then(JSON.parse)
    const jsonData = createEventSchema.array().parse(content)

    await importEvents(jsonData)
    return c.json({ message: '更新成功' })
  })
  .post('/', zValidator('json', createEventSchema), async c => {
    const eventData = c.req.valid('json')

    const newEvent = await createEvent(eventData)
    return c.json(newEvent, { status: 201 })
  })
  .put(
    '/:id',
    zValidator('json', createEventSchema),
    zValidator('param', z.object({ id: z.coerce.number().int() })),
    async c => {
      const { id } = c.req.valid('param')
      const eventData = c.req.valid('json')

      await updateEvent(id, eventData)
      return c.json({ message: '更新成功' }, { status: 200 })
    },
  )
  .delete('/:id', zValidator('param', z.object({ id: z.coerce.number().int() })), async c => {
    const { id } = c.req.valid('param')

    await deleteEvent(id)
    return c.json({ message: '删除成功' }, { status: 200 })
  })
