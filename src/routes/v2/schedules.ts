import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'
import { getCronJobs, getCronJobsByEventId } from '../../services/schedules'

export const schedulesRouteV2 = new Hono()
  .get('/', async c => {
    const cronJobs = getCronJobs()
    return c.json([...cronJobs.keys()])
  })
  .get('/:id', zValidator('param', z.object({ id: z.coerce.number().int() })), async c => {
    const { id } = c.req.valid('param')
    const jobs = getCronJobsByEventId(id)
    return c.json(jobs?.map(j => j.cronTime))
  })
