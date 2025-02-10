import { Hono } from 'hono'
import { scheduleHandler } from '../handlers'
import { authMiddleware } from '../middlewares'

export const scheduleRouter = new Hono()
  .get('/schedules', authMiddleware.adminRequired, scheduleHandler.getSchedules)
  .get('/schedules/:id', authMiddleware.adminRequired, scheduleHandler.getScheduleById)
