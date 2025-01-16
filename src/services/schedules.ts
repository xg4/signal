import { CronJob } from 'cron'
import dayjs from 'dayjs'
import type { Event } from '../types/events'
import { getEventDate, getEvents } from './events'
import { sendToAll } from './notifications'
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
        async () => {
          const startsAt = getEventDate(event)
          const diff = startsAt.diff(dayjs(), 'minute')
          const title = [event.name, diff <= 1 ? '开始' : startsAt.fromNow() + '即将开始'].join(' - ')
          const body = event.locations.join(' - ') || event.description || ''
          await sendToAll(title, body)
        },
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
