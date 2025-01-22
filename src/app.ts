import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
import duration from 'dayjs/plugin/duration'
import relativeTime from 'dayjs/plugin/relativeTime'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { jwt } from 'hono/jwt'
import { logger } from 'hono/logger'
import webpush from 'web-push'
import { ProcessEnv } from './env'
import {
  authRoute,
  eventsRoute,
  eventsV2Route,
  notificationsV2Route,
  schedulesV2Route,
  subscriptionsRoute,
  subscriptionsV2Route,
} from './routes'

dayjs.extend(relativeTime)
dayjs.locale('zh-cn')
dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(duration)

const vapidKeys = {
  publicKey: ProcessEnv.VAPID_PUBLIC_KEY,
  privateKey: ProcessEnv.VAPID_PRIVATE_KEY,
}

webpush.setVapidDetails('mailto:your-email@example.com', vapidKeys.publicKey, vapidKeys.privateKey)

const app = new Hono().use(cors()).use(
  logger((msg: string) => {
    console.log(dayjs().tz('Asia/Shanghai').format('YYYY-MM-DD HH:mm:ss'), msg)
  }),
)

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
  .route('/schedules', schedulesV2Route)
  .route('/events', eventsV2Route)
  .route('/subscriptions', subscriptionsV2Route)
  .route('/notifications', notificationsV2Route)

export default app
