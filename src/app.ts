import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
import duration from 'dayjs/plugin/duration'
import relativeTime from 'dayjs/plugin/relativeTime'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { HTTPException } from 'hono/http-exception'
import { requestId } from 'hono/request-id'
import { ZodError } from 'zod'
import { pinoLogger } from './middlewares/logger'
import { eventRoutes, subscriptionRoutes, userRoutes } from './routes'

dayjs.locale('zh-cn')
dayjs.extend(relativeTime)
dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(duration)

const app = new Hono().use(cors()).use(requestId()).use(pinoLogger)

app.onError((err, c) => {
  if (err instanceof HTTPException) {
    if (err.status === 401) {
      return c.json({ message: '未登录' }, err.status)
    }
    return c.json({ message: err.message }, err.status)
  }
  if (err instanceof ZodError) {
    const [e] = err.errors
    return c.json(e ? e : { message: err.message }, 400)
  }

  c.var.logger.error(err)
  return c.json({ message: 'Internal Server Error' }, 500)
})

app.get('/', c => c.json({ status: 'ok', date: new Date() }))

app.route('/events', eventRoutes)
app.route('/subscriptions', subscriptionRoutes)
app.route('/', userRoutes)

export default app
