import { Hono } from 'hono'
import webpush from 'web-push'
import { subscriptionsRoute } from './routes/subscriptions.js'
import { eventsRoute } from './routes/events.js'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import duration from 'dayjs/plugin/duration'
import 'dayjs/locale/zh-cn'
import relativeTime from 'dayjs/plugin/relativeTime'
import './schedules/subscriptions.js'
import { cors } from 'hono/cors'

dayjs.extend(relativeTime)
dayjs.locale('zh-cn')
dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(duration)

const vapidKeys = {
  publicKey: process.env.VAPID_PUBLIC_KEY!,
  privateKey: process.env.VAPID_PRIVATE_KEY!,
}

webpush.setVapidDetails('mailto:your-email@example.com', vapidKeys.publicKey, vapidKeys.privateKey)

const app = new Hono().use(cors())

app.basePath('/api').route('/subscriptions', subscriptionsRoute).route('/events', eventsRoute)

export default app
