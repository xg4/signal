import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'
import { getCronJobs } from '../../services/schedules'

export const schedulesRoute = new Hono()
  .get('/', async c => {
    const cronJobs = getCronJobs()
    return c.json([...cronJobs.keys()])
  })
  .get('/:id', zValidator('param', z.object({ id: z.coerce.number().int() })), async c => {
    const { id } = c.req.valid('param')
    const cronJobs = getCronJobs()
    const jobs = cronJobs.get(id)
    if (!jobs) {
      return c.json({ message: 'not found' }, { status: 404 })
    }
    return c.json(jobs.map(j => j.cronTime.source))
  })
