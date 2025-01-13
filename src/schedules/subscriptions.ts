import { CronJob } from 'cron'
import dayjs from 'dayjs'
import { getEvents } from '../services/events'
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
  const jobs = events.map(e => {
    const startsAt = dayjs(e.startsAt).tz('Asia/Shanghai')
    return [
      startsAt.subtract(30, 'minutes'),
      startsAt.subtract(15, 'minutes'),
      startsAt.subtract(5, 'minutes'),
      startsAt,
    ].map(d => createJob(e, d))
  })
  console.log('🚀 ~ bootstrap ~ jobs:', jobs.flat().length)
}

bootstrap()
