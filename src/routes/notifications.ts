import { Hono } from 'hono'
import { notificationHandler } from '../handlers'
import { authMiddleware } from '../middlewares'

export const notificationRouter = new Hono().post(
  '/notifications',
  authMiddleware.adminRequired,
  notificationHandler.sendMessage,
)
