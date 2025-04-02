import type { Prisma, Subscription } from '@prisma/client'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod'
import { notificationsService } from '.'
import { sha256 } from '../utils/crypto'
import { prisma } from '../utils/prisma'

export const paramsSchema = z.object({
  pageSize: z.coerce.number().default(20),
  current: z.coerce.number().default(1),
  endpoint: z.string().trim().optional(),
})

export const querySchema = z.object({
  params: paramsSchema,
})

function generateConditions(params: z.infer<typeof paramsSchema>) {
  const conditions: Prisma.SubscriptionWhereInput = {
    endpoint: {
      startsWith: params.endpoint,
    },
    deletedAt: null,
  }

  return conditions
}

export function getCount(params: z.infer<typeof paramsSchema>) {
  return prisma.subscription.count({
    where: generateConditions(params),
  })
}

export function query({ params }: z.infer<typeof querySchema>) {
  const take = params.pageSize
  const skip = (params.current - 1) * params.pageSize
  return prisma.subscription.findMany({
    where: generateConditions(params),
    take,
    skip,
  })
}

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

export async function update(deviceCode: string, data: z.infer<typeof updateSchema>) {
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

export async function create(data: z.infer<typeof subscriptionInsetSchema>) {
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

export async function remove(deviceCode: string) {
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
