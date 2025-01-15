import { CronJob } from 'cron'
import type { EventItem } from '../types/events'
import { sendNotifications } from '../utils/sendNotifications'
import { getEventDate, getEvents } from './events'

export function updateSchedule(event: EventItem) {
  const jobs = cronJobs.get(event.id)
  if (jobs) {
    jobs.forEach(job => {
      job.stop()
    })
  }

  const newJobs = createJob(event)
  cronJobs.set(event.id, newJobs)
  console.log('cron job 更新成功', event.id, [...cronJobs.values()].flat().length)
}

let cronJobs = new Map<number, CronJob[]>()

export function getCronJobs() {
  return cronJobs
}

function createJob(event: EventItem) {
  const cronDates = event.notifyMinutes.map(m => getEventDate(event).tz('Asia/Shanghai').subtract(m, 'minutes'))
  return cronDates.map(
    cronDate =>
      new CronJob(
        `${cronDate.second()} ${cronDate.minute()} ${cronDate.hour()} * * ${event.dayOfWeek}`,
        () => sendNotifications(event),
        null,
        true,
        'Asia/Shanghai',
      ),
  )
}

async function bootstrap() {
  const events = await getEvents()
  const jobs = events.map(e => [e.id, createJob(e)] as const)
  cronJobs = new Map(jobs)
  console.log('🚀 ~ bootstrap ~ cron jobs:', [...cronJobs.values()].flat().length)
}

bootstrap()
