import { Context } from 'hono'
import { z } from 'zod'
import { scheduleService } from '../services'

export const getSchedules = async (c: Context) => {
  const cronJobs = scheduleService.getCronJobs()
  return c.json([...cronJobs.keys()])
}

export const getScheduleById = async (c: Context) => {
  const { id } = z.object({ id: z.coerce.number().int() }).parse(c.req.param())
  const jobs = scheduleService.getCronJobsByEventId(id)
  return c.json(jobs?.map(j => j.cronTime))
}
