import type { Context } from 'hono'
import { z } from 'zod'
import { subscriptionService } from '../services'

const deviceCodeSchema = z.object({
  code: z
    .string({
      message: '无效的设备码',
    })
    .length(64, {
      message: '无效的设备码',
    }), // SHA-256 哈希值长度为 64 个字符
})

export const createSubscriptionByJSON = async (c: Context) => {
  const data = await subscriptionService.createSubscriptionsSchema.array().min(1).promise().parse(c.req.json())

  const deviceCode = await subscriptionService.createSubscriptionByJSON(data)
  return c.json(deviceCode, { status: 201 })
}

export const createSubscription = async (c: Context) => {
  const { subscription } = await subscriptionService.createSubscriptionSchema.promise().parse(c.req.json())

  const deviceCode = await subscriptionService.createSubscription(subscription)
  return c.json(deviceCode, { status: 201 })
}

export const getSubscriptionByDeviceCode = async (c: Context) => {
  const { code } = deviceCodeSchema.parse(c.req.param())
  const exists = await subscriptionService.getSubscriptionByDeviceCode(code)
  return c.json(!!exists)
}

export const deleteSubscription = async (c: Context) => {
  const { code } = deviceCodeSchema.parse(c.req.param())
  await subscriptionService.deleteSubscription(code)
  return c.json({ message: '删除成功' })
}

export const getAllSubscriptions = async (c: Context) => {
  const list = await subscriptionService.getSubscriptions()
  return c.json(list)
}
