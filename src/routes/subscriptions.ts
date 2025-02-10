import { Hono } from 'hono'
import { subscriptionHandler } from '../handlers'
import { authMiddleware } from '../middlewares'

export const subscriptionRouter = new Hono()
  .get('/subscriptions/:code', subscriptionHandler.getSubscriptionByDeviceCode)
  .post('/subscriptions', subscriptionHandler.createSubscription)
  .delete('/subscriptions/:code', subscriptionHandler.deleteSubscription)
  .get('/subscriptions', authMiddleware.adminRequired, subscriptionHandler.getAllSubscriptions)
