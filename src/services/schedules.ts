import { CronJob } from 'cron'
import type { Event } from '../types/events'
import { getEventDate, getEvents } from './events'
import { sendToAllSubscriptions } from './notifications'
export function updateSchedule(event: Event) {
  const jobs = cronJobs.get(event.id)
  if (jobs) {
    jobs.forEach(job => {
      job.stop()
    })
  }

  const newJobs = createCronJob(event)
  cronJobs.set(event.id, newJobs)
  console.log('cron job 更新成功', event.id, [...cronJobs.values()].flat().length)
}

let cronJobs = new Map<number, CronJob[]>()

export function getCronJobs() {
  return cronJobs
}

export function deleteCronJob(eventId: number) {
  const jobs = cronJobs.get(eventId)
  if (jobs) {
    jobs.forEach(job => {
      job.stop()
    })
  }
  cronJobs.delete(eventId)
}

export function createCronJob(event: Event) {
  const cronDates = event.notifyMinutes.map(m => getEventDate(event).tz('Asia/Shanghai').subtract(m, 'minutes'))
  return cronDates.map(
    cronDate =>
      new CronJob(
        `${cronDate.second()} ${cronDate.minute()} ${cronDate.hour()} * * ${event.dayOfWeek}`,
        () => sendToAllSubscriptions(event),
        null,
        true,
        'Asia/Shanghai',
      ),
  )
}

async function bootstrap() {
  const events = await getEvents()
  const jobs = events.map(e => [e.id, createCronJob(e)] as const)
  cronJobs = new Map(jobs)
  console.log('🚀 ~ bootstrap ~ cron jobs:', [...cronJobs.values()].flat().length)
}

bootstrap()
