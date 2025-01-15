import dayjs from 'dayjs'
import { eq } from 'drizzle-orm'
import webpush from 'web-push'
import { db } from '../db/config'
import { subscriptions } from '../db/schema'
import { getEventDate } from '../services/events'
import type { EventItem } from '../types/events'

export async function sendNotifications(event: EventItem) {
  // 获取所有有效的订阅
  const subs = await db.select().from(subscriptions)

  const startsAt = getEventDate(event)
  const diff = startsAt.diff(dayjs(), 'minute')
  const title = [event.name, diff <= 1 ? '开始' : diff <= 5 ? '即将开始' : startsAt.fromNow() + '开始'].join(' - ')
  const payload = JSON.stringify({
    title,
    body: event.description || '',
    icon: '/images/icon_128x128.png',
  })

  await Promise.allSettled(
    subs.map(async sub => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { auth: sub.auth, p256dh: sub.p256dh },
          },
          payload,
        )
        console.log(`成功发送通知给订阅者 ${sub.id}`)
      } catch (error) {
        console.error('发送通知失败:', error)
        if (error instanceof Error && 'statusCode' in error && error.statusCode === 410) {
          await db.delete(subscriptions).where(eq(subscriptions.id, sub.id))
          console.log(`已删除失效的订阅: ${sub.id}`)
        }
      }
    }),
  )
}
