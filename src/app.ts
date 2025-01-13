import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
import duration from 'dayjs/plugin/duration'
import relativeTime from 'dayjs/plugin/relativeTime'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import webpush from 'web-push'
import { ProcessEnv } from './env.js'
import { eventsRoute } from './routes/events.js'
import { subscriptionsRoute } from './routes/subscriptions.js'
import './schedules/subscriptions.js'

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

app.basePath('/api').route('/subscriptions', subscriptionsRoute).route('/events', eventsRoute)

export default app
