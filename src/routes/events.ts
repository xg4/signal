import { Hono } from 'hono'
import { adminRequired } from '../middlewares/auth'
import { zValidator } from '../middlewares/zod-validator'
import { eventsService, notificationsService, recurrenceService, remindersService } from '../services'
import { idValidator } from '../utils/validator'

export const eventRoutes = new Hono()

eventRoutes.post('/message/query', adminRequired, zValidator('json', notificationsService.userSchema), async c => {
  const query = c.req.valid('json')
  const result = await notificationsService.getJobs(query)
  return c.json(result)
})

eventRoutes.post('/recurrence/query', adminRequired, zValidator('json', recurrenceService.jobQuerySchema), async c => {
  const query = c.req.valid('json')
  const result = await recurrenceService.getJobs(query)
  return c.json(result)
})

eventRoutes.post('/reminders/query', adminRequired, zValidator('json', remindersService.querySchema), async c => {
  const query = c.req.valid('json')
  const result = await remindersService.getJobs(query)
  return c.json(result)
})

eventRoutes.get('/recurrence/:key', adminRequired, async c => {
  const { key } = c.req.param()
  const result = await recurrenceService.getJobScheduler(key)
  return c.json(result)
})

eventRoutes.get('/reminder/:key', adminRequired, async c => {
  const { key } = c.req.param()
  const result = await remindersService.getStatus(key)
  return c.json(result)
})

eventRoutes.get('/', async c => {
  const allEvents = await eventsService.getAll()
  return c.json(allEvents)
})

eventRoutes.post('/query', zValidator('json', eventsService.querySchema), async c => {
  const queryData = c.req.valid('json')
  const [data, total] = await Promise.all([eventsService.query(queryData), eventsService.getCount(queryData.params)])
  return c.json({
    data,
    total,
  })
})

eventRoutes.get('/:id', zValidator('param', idValidator), async c => {
  const { id } = c.req.valid('param')
  const event = await eventsService.getEventById(id)
  return c.json(event)
})

eventRoutes.post('/', adminRequired, zValidator('json', eventsService.eventInsetSchema), async c => {
  const eventData = c.req.valid('json')
  const newEvent = await eventsService.create(eventData)
  return c.json(newEvent, 201)
})

eventRoutes.put(
  '/:id',
  adminRequired,
  zValidator('param', idValidator),
  zValidator('json', eventsService.eventInsetSchema),
  async c => {
    const { id } = c.req.valid('param')
    const updateData = c.req.valid('json')
    const updatedEvent = await eventsService.update(id, updateData)
    return c.json(updatedEvent)
  },
)

eventRoutes.delete('/:id', adminRequired, zValidator('param', idValidator), async c => {
  const { id } = c.req.valid('param')
  await eventsService.remove(id)
  return c.json(null)
})

eventRoutes.post('/batch', adminRequired, zValidator('json', eventsService.eventBatchInsetSchema), async c => {
  const eventsArray = c.req.valid('json')
  const createdEvents = await eventsService.batch(eventsArray)
  return c.json(createdEvents, 201)
})
