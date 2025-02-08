import { Hono } from 'hono'
import { jwt } from 'hono/jwt'
import { ProcessEnv } from '../env'
import { eventHandler, notificationHandler, scheduleHandler, subscriptionHandler, userHandler } from '../handlers'

const publicRouter = new Hono()
  .post('/login', userHandler.login)
  .post('/register', userHandler.register)
  .get('/events', eventHandler.getEvents)
  .get('/events/:id', eventHandler.getEventById)
  .get('/subscriptions/:code', subscriptionHandler.getSubscriptionByDeviceCode)
  .post('/subscriptions', subscriptionHandler.createSubscription)
  .delete('/subscriptions/:code', subscriptionHandler.deleteSubscription)

const protectedRouter = new Hono()
  .use(
    jwt({
      secret: ProcessEnv.JWT_SECRET,
    }),
  )
  .get('/users', userHandler.getCurrentUser)
  .post('/events', eventHandler.createEvent)
  .put('/events/:id', eventHandler.updateEvent)
  .delete('/events/:id', eventHandler.deleteEvent)
  .post('/events/json', eventHandler.createEventByJSON)
  .get('/subscriptions', subscriptionHandler.getAllSubscriptions)
  .post('/notifications', notificationHandler.sendMessage)
  .get('/schedules', scheduleHandler.getSchedules)
  .get('/schedules/:id', scheduleHandler.getScheduleById)

export const routes = new Hono().basePath('/api').route('/', publicRouter).route('/', protectedRouter)
