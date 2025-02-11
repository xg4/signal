import { eq } from 'drizzle-orm'
import webpush from 'web-push'
import { db } from '../db'
import { subscriptions } from '../db/schema'
import { ProcessEnv } from '../env'

const vapidKeys = {
  publicKey: ProcessEnv.VAPID_PUBLIC_KEY,
  privateKey: ProcessEnv.VAPID_PRIVATE_KEY,
}

webpush.setVapidDetails('mailto:your-email@example.com', vapidKeys.publicKey, vapidKeys.privateKey)

function generatePayload(title: string, body: string) {
  return JSON.stringify({
    title,
    body,
    icon: '/images/icon_128x128.png',
  })
}

export async function sendByDeviceCode(deviceCode: string, title: string, body: string) {
  const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.deviceCode, deviceCode)).limit(1)
  if (!sub) {
    throw new Error('订阅不存在')
  }
  const payload = generatePayload(title, body)
  await webpush.sendNotification({ endpoint: sub.endpoint, keys: { auth: sub.auth, p256dh: sub.p256dh } }, payload)
}

export async function sendToAll(title: string, body: string) {
  const payload = generatePayload(title, body)
  const subs = await db.select().from(subscriptions)
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
