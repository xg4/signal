import { Hono } from 'hono'
import { getEvents } from '../services/events'

export const eventsRoute = new Hono().get('/', async c => {
  try {
    const allEvents = await getEvents()
    return c.json(allEvents)
  } catch (error) {
    console.error('获取事件失败:', error)
    return c.json({ error: '获取事件失败' }, { status: 500 })
  }
})
