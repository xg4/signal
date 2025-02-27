import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'
import { authMiddleware } from '../middlewares'
import { scheduleService } from '../services'

export const scheduleRouter = new Hono()

scheduleRouter.get('/schedules', authMiddleware.adminRequired, async c => {
  const cronJobs = scheduleService.getCronJobs()
  return c.json([...cronJobs.keys()])
})

scheduleRouter.get(
  '/schedules/:id',
  authMiddleware.adminRequired,
  zValidator('param', z.object({ id: z.coerce.number().int() })),
  async c => {
    const { id } = c.req.valid('param')
    const jobs = scheduleService.getCronJobsByEventId(id)
    return c.json(jobs?.map(j => j.cronTime))
  },
)
