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
import { jwt } from 'hono/jwt'
import { logger } from 'hono/logger'
import { ProcessEnv } from './env'
import {
  authRoute,
  eventsRoute,
  eventsRouteV2,
  notificationsRouteV2,
  schedulesRouteV2,
  subscriptionsRoute,
  subscriptionsRouteV2,
} from './routes'
import { initSchedules } from './services/schedules'

dayjs.extend(relativeTime)
dayjs.locale('zh-cn')
dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(duration)

initSchedules()

type Variables = JwtVariables

const app = new Hono<{ Variables: Variables }>().use(cors()).use(
  logger((msg: string) => {
    console.log(dayjs().tz('Asia/Shanghai').format('YYYY-MM-DD HH:mm:ss'), msg)
  }),
)

app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return c.json({ message: err.message }, err.status)
  }
  console.error('🚀 ~ app.onError ~ onError:', err)
  return c.json({ message: 'Internal Server Error' }, 500)
})

app
  .basePath('/api')
  .route('/auth', authRoute)
  .route('/subscriptions', subscriptionsRoute)
  .route('/events', eventsRoute)
  .basePath('/v2')
  .use(
    jwt({
      secret: ProcessEnv.JWT_SECRET,
    }),
  )
  .route('/schedules', schedulesRouteV2)
  .route('/events', eventsRouteV2)
  .route('/subscriptions', subscriptionsRouteV2)
  .route('/notifications', notificationsRouteV2)

export default app
