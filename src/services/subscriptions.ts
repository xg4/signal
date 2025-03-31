import type { Subscription } from '@prisma/client'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod'
import { notificationsService } from '.'
import { sha256 } from '../utils/crypto'
import { prisma } from '../utils/prisma'

export const subscriptionInsetSchema = z.object({
  endpoint: z.string().url({
    message: '无效的订阅链接',
  }),
  auth: z.string(),
  p256dh: z.string(),
  deviceCode: z.string(),
  userAgent: z.string().optional(),
})

export function generateSubscriptionKey(subscription: Pick<Subscription, 'endpoint' | 'auth' | 'p256dh'>) {
  return sha256([subscription.endpoint, subscription.auth, subscription.p256dh].join('|'))
}

export async function getSubscriptionByDeviceCode(deviceCode: string) {
  const subscription = await prisma.subscription.findUnique({
    where: {
      deviceCode,
    },
  })
  return subscription
}

export const updateSchema = subscriptionInsetSchema.partial()

export async function updateSubscription(deviceCode: string, data: z.infer<typeof updateSchema>) {
  const existingSubscription = await getSubscriptionByCode(deviceCode)
  if (!existingSubscription) {
    throw new HTTPException(404, { message: '订阅不存在' })
  }
  const updated = await prisma.subscription.update({
    where: {
      deviceCode,
    },
    data,
  })
  return updated
}

export async function saveSubscription(data: z.infer<typeof subscriptionInsetSchema>) {
  const existingSubscription = await prisma.subscription.findUnique({
    where: {
      deviceCode: data.deviceCode,
    },
  })

  if (existingSubscription) {
    const updated = await prisma.subscription.update({
      where: {
        deviceCode: data.deviceCode,
      },
      data,
    })

    return updated
  }

  const newSubscription = await prisma.subscription.create({
    data,
  })

  await notificationsService.enqueue(newSubscription, {
    title: '订阅成功',
    body: '您已成功订阅所有活动通知',
  })

  return newSubscription
}

export async function getSubscriptionByCode(deviceCode: string) {
  return prisma.subscription.findUnique({
    where: {
      deviceCode,
    },
  })
}

export async function deleteSubscription(deviceCode: string) {
  const existingSubscription = await getSubscriptionByCode(deviceCode)
  if (!existingSubscription) {
    throw new HTTPException(404, { message: '订阅不存在' })
  }

  await prisma.subscription.delete({
    where: {
      deviceCode,
    },
  })
}
