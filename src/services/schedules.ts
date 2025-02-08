import { CronJob } from 'cron'
import dayjs from 'dayjs'
import { eventService, notificationService } from '.'
import { events } from '../db/schema'

const cronJobs = new Map<number, CronJob[]>()

export function getCronJobs() {
  return cronJobs
}

export function getCronJobsByEventId(eventId: number) {
  const jobs = cronJobs.get(eventId)
  return jobs
}

export function deleteCronJob(eventId: number) {
  const jobs = cronJobs.get(eventId)
  if (jobs) {
    jobs.forEach(job => job.stop())
    cronJobs.delete(eventId)
  }
}

export function updateSchedule(event: typeof events.$inferSelect) {
  // 停止旧的定时任务
  deleteCronJob(event.id)

  // 如果没有通知时间，直接返回
  if (!event.notifyMinutes?.length) {
    return
  }

  const eventDate = eventService.getEventDate(event)

  // 为每个通知时间创建定时任务
  const jobs = event.notifyMinutes.map(minutes => {
    const notifyDate = eventDate.subtract(minutes, 'minute')
    const cronTime = `${notifyDate.minute()} ${notifyDate.hour()} * * ${event.dayOfWeek}`

    return new CronJob(
      cronTime,
      async () => {
        try {
          const diff = eventDate.diff(dayjs(), 'minute')
          const title = [event.name, diff <= 1 ? '开始' : eventDate.fromNow() + '即将开始'].join(' - ')
          const body = event.locations.join(' - ') || event.description || ''
          await notificationService.sendToAll(title, body)
        } catch (error) {
          console.error('🚀 ~ sendToAll ~ error:', event.id, error)
        }
      },
      null,
      true,
      'Asia/Shanghai',
    )
  })

  cronJobs.set(event.id, jobs)

  console.log('🚀 ~ updateSchedule ~ eventId:', event.id, 'jobs:', jobs.length)

  return jobs
}

// 初始化所有活动的定时任务
export async function initSchedules() {
  const allEvents = await eventService.getEvents()
  const allJobs = allEvents.map(event => updateSchedule(event))
  console.log('🚀 ~ initSchedules ~ allJobs:', allJobs.flat().length)
}
