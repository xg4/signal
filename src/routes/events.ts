import { Hono } from 'hono'
import { eventHandler } from '../handlers'
import { authMiddleware } from '../middlewares'

export const eventRouter = new Hono()
  .get('/events', eventHandler.getEvents)
  .get('/events/:id', eventHandler.getEventById)
  .post('/events', authMiddleware.adminRequired, eventHandler.createEvent)
  .put('/events/:id', authMiddleware.adminRequired, eventHandler.updateEvent)
  .delete('/events/:id', authMiddleware.adminRequired, eventHandler.deleteEvent)
  .post('/events/json', authMiddleware.adminRequired, eventHandler.createEventByJSON)
