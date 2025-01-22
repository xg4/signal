import { Hono } from 'hono'
import { getSubscriptions } from '../../services/subscriptions'

export const subscriptionsRouteV2 = new Hono().get('/', async c => {
  const list = await getSubscriptions()
  return c.json(list)
})
