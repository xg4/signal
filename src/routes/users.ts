import { Hono } from 'hono'
import { userHandler } from '../handlers'
import { authMiddleware } from '../middlewares'

export const userRouter = new Hono()
  .get('/users', authMiddleware.userRequired, userHandler.getCurrentUser)
  .post('/login', userHandler.login)
  .post('/register', userHandler.register)
