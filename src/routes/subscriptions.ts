import { zValidator } from '@hono/zod-validator'
import { eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { isEmpty, isNil } from 'lodash-es'
import { z } from 'zod'
import { db } from '../db/config'
import { subscriptions } from '../db/schema'
import { sendByDeviceCode } from '../services/notifications'
import { generateSubscriptionKey } from '../utils/crypto'

export const subscriptionsRoute = new Hono()
  .post(
    '/',
    zValidator(
      'json',
      z.object({
        subscription: z.object({
          endpoint: z.string().url(),
          keys: z.object({
            auth: z.string(),
            p256dh: z.string(),
          }),
        }),
      }),
    ),
    async c => {
      try {
        const { subscription } = c.req.valid('json')
        const deviceCode = await generateSubscriptionKey(subscription)

        // 检查是否已经订阅
        const [existingSubscription] = await db
          .select()
          .from(subscriptions)
          .where(eq(subscriptions.deviceCode, deviceCode))

        if (!isEmpty(existingSubscription)) {
          return c.json({ message: '已经订阅' }, { status: 409 })
        }

        // 保存订阅信息
        await db.insert(subscriptions).values({
          endpoint: subscription.endpoint,
          auth: subscription.keys.auth,
          p256dh: subscription.keys.p256dh,
          deviceCode,
        })

        try {
          await sendByDeviceCode(deviceCode, '订阅成功', '您已成功订阅所有活动通知')
        } catch (error) {
          console.error('发送欢迎通知失败:', error)
        }

        return c.json(deviceCode, { status: 201 })
      } catch (error) {
        console.error('订阅失败:', error)
        return c.json({ error: '订阅失败' }, { status: 500 })
      }
    },
  )
  .get(
    '/:code',
    zValidator(
      'param',
      z.object({
        code: z.string().length(64),
      }),
    ),
    async c => {
      try {
        const { code } = c.req.valid('param')

        const [existingSubscription] = await db.select().from(subscriptions).where(eq(subscriptions.deviceCode, code))

        return c.json(!isNil(existingSubscription))
      } catch (error) {
        console.error('检查订阅状态失败:', error)
        return c.json({ error: '检查订阅状态失败' }, { status: 500 })
      }
    },
  )
  .delete(
    '/:code',
    zValidator(
      'param',
      z.object({
        code: z.string().length(64), // SHA-256 哈希值长度为 64 个字符
      }),
    ),
    async c => {
      try {
        const { code } = c.req.valid('param')
        const [existingSubscription] = await db.select().from(subscriptions).where(eq(subscriptions.deviceCode, code))

        if (isNil(existingSubscription)) {
          return c.json({ error: '订阅不存在' }, { status: 404 })
        }

        await db.delete(subscriptions).where(eq(subscriptions.deviceCode, code))

        return c.json({ message: '删除成功' }, { status: 200 })
      } catch (error) {
        console.error('删除订阅失败:', error)
        return c.json({ error: '删除订阅失败' }, { status: 500 })
      }
    },
  )
