import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'
import webpush from 'web-push'
import { eq } from 'drizzle-orm'
import { isEmpty } from 'lodash-es'
import { db } from '../db/config.js'
import { subscriptions } from '../db/schema.js'
import { generateSubscriptionKey } from '../utils/crypto.js'

export const subscriptionsRoute = new Hono()
  .post(
    '/',
    zValidator(
      'json',
      z.object({
        subscription: z.object({
          endpoint: z.string(),
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
        const subscriptionHash = await generateSubscriptionKey(subscription)

        // 检查是否已经订阅
        const existingSubscription = await db
          .select()
          .from(subscriptions)
          .where(eq(subscriptions.hash, subscriptionHash))

        if (!isEmpty(existingSubscription)) {
          return c.json({ message: '已经订阅' }, { status: 409 })
        }

        // 保存订阅信息
        await db.insert(subscriptions).values({
          endpoint: subscription.endpoint,
          auth: subscription.keys.auth,
          p256dh: subscription.keys.p256dh,
          hash: subscriptionHash,
        })

        try {
          await webpush.sendNotification(
            subscription,
            JSON.stringify({
              title: '订阅成功',
              body: '您已成功订阅所有活动通知',
              icon: '/images/icon_128x128.png',
            }),
          )
        } catch (error) {
          console.error('发送欢迎通知失败:', error)
        }

        return c.json(subscriptionHash, { status: 201 })
      } catch (error) {
        console.error('订阅失败:', error)
        return c.json({ error: '订阅失败' }, { status: 500 })
      }
    },
  )
  .get(
    '/:hash',
    zValidator(
      'param',
      z.object({
        hash: z.string().length(64), // SHA-256 哈希值长度为 64 个字符
      }),
    ),
    async c => {
      try {
        const { hash } = c.req.valid('param')

        const existingSubscription = await db.select().from(subscriptions).where(eq(subscriptions.hash, hash))

        return c.json(!isEmpty(existingSubscription))
      } catch (error) {
        console.error('检查订阅状态失败:', error)
        return c.json({ error: '检查订阅状态失败' }, { status: 500 })
      }
    },
  )
  .delete(
    '/:hash',
    zValidator(
      'param',
      z.object({
        hash: z.string().length(64), // SHA-256 哈希值长度为 64 个字符
      }),
    ),
    async c => {
      try {
        const { hash } = c.req.valid('param')
        const existingSubscription = await db.select().from(subscriptions).where(eq(subscriptions.hash, hash))

        if (isEmpty(existingSubscription)) {
          return c.json({ error: '订阅不存在' }, { status: 404 })
        }

        await db.delete(subscriptions).where(eq(subscriptions.hash, hash))

        return c.json({ message: '删除成功' }, { status: 200 })
      } catch (error) {
        console.error('删除订阅失败:', error)
        return c.json({ error: '删除订阅失败' }, { status: 500 })
      }
    },
  )
