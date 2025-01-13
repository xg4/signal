import { CronJob } from 'cron'
import dayjs from 'dayjs'
import { getEventDate, getEvents } from '../services/events'
import type { Event } from '../types/events'
import { sendNotifications } from '../utils/sendNotifications'

function createJob(event: Event, cronDate: dayjs.Dayjs) {
  return new CronJob(
    `${cronDate.second()} ${cronDate.minute()} ${cronDate.hour()} * * ${event.dayOfWeek}`,
    () => sendNotifications(event),
    null,
    true,
    'Asia/Shanghai',
  )
}

async function bootstrap() {
  const events = await getEvents()
  const jobs = events.map(e =>
    e.notifyMinutes.map(m => getEventDate(e).tz('Asia/Shanghai').subtract(m, 'minutes')).map(d => createJob(e, d)),
  )
  console.log('🚀 ~ bootstrap ~ jobs:', jobs.flat().length)
}

bootstrap()
