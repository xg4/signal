import { Hono } from 'hono'
import { userHandler } from '../handlers'
import { authMiddleware } from '../middlewares'

export const userRouter = new Hono()
  .get('/current', authMiddleware.userRequired, userHandler.getCurrentUser)
  .get('/users', authMiddleware.adminRequired, userHandler.getUsers)
  .post('/login', userHandler.login)
  .post('/register', userHandler.register)
