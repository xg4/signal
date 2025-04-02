import type { Subscription } from '@prisma/client'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod'
import { notificationQueue } from '../queues/notification'
import { generateOffset, pageSchema } from '../utils/filter'
import { prisma } from '../utils/prisma'
import type { NotificationPayload } from '../utils/push'

export async function enqueue(subscription: Subscription, payload: NotificationPayload) {
  return notificationQueue.add(['notification', subscription.id].join('_'), { subscription, payload })
}

export async function send(id: number, { title, content }: { title: string; content: string }) {
  const s = await prisma.subscription.findUnique({
    where: {
      id,
    },
  })
  if (!s) {
    throw new HTTPException(404, { message: '未找到订阅者' })
  }
  return enqueue(s, {
    title,
    body: content,
  })
}

export const userSchema = z.object({
  params: z
    .object({
      id: z.string().trim(),
      name: z.string().trim(),
    })
    .partial()
    .merge(pageSchema),
})

export async function getJobs({ params }: z.infer<typeof userSchema>) {
  const jobs = await notificationQueue.getJobs([])
  const filteredJobs = jobs.filter(j => {
    if (params.name) {
      return j.name.includes(params.name)
    }
    if (params.id) {
      return j.id?.includes(params.id)
    }
    return true
  })

  const { take, skip } = generateOffset(params)

  return { data: filteredJobs.slice(skip, skip + take), total: filteredJobs.length }
}
