import dayjs from 'dayjs'
import { sortBy } from 'lodash-es'
import { db } from '../db/config'
import { events } from '../db/schema'

export function setDayOfWeek(dayOfWeek: number) {
  const now = dayjs()
  const currentDayOfWeek = now.day()
  const diff = (dayOfWeek || 7) - (currentDayOfWeek || 7)
  return now.add(diff, 'day')
}

export function getEventDate(event: { dayOfWeek: number; startTime: string }) {
  const day = setDayOfWeek(event.dayOfWeek)
  return dayjs.tz(`${day.format('YYYY-MM-DD')} ${event.startTime}`, 'Asia/Shanghai')
}

export async function getEvents() {
  const allEvents = await db.select().from(events)
  return sortBy(allEvents, e => getEventDate(e).unix())
}
