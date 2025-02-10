import { Hono } from 'hono'
import { eventRouter } from './events'
import { notificationRouter } from './notifications'
import { scheduleRouter } from './schedules'
import { subscriptionRouter } from './subscriptions'
import { userRouter } from './users'

export const routes = new Hono()
  .basePath('/api')
  .route('/', userRouter)
  .route('/', eventRouter)
  .route('/', subscriptionRouter)
  .route('/', notificationRouter)
  .route('/', scheduleRouter)
