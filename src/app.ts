import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
import duration from 'dayjs/plugin/duration'
import relativeTime from 'dayjs/plugin/relativeTime'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { HTTPException } from 'hono/http-exception'
import type { JwtVariables } from 'hono/jwt'
import { ZodError } from 'zod'
import { logger } from './middlewares/logger'
import { routes } from './routes'
import { scheduleService } from './services'

dayjs.locale('zh-cn')
dayjs.extend(relativeTime)
dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(duration)

scheduleService.initSchedules()

type Variables = JwtVariables

const app = new Hono<{ Variables: Variables }>().use(cors()).use(logger)

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

  console.error('🚀 ~ app.onError ~ onError:', err)
  return c.json({ message: 'Internal Server Error' }, 500)
})

app.route('/', routes)

export default app
