import type { Subscription } from '@prisma/client'
import { z } from 'zod'
import { notificationQueue } from '../queues/notification'
import type { NotificationPayload } from '../utils/push'

export async function enqueue(subscription: Subscription, payload: NotificationPayload) {
  return notificationQueue.add(['notification', subscription.id].join('_'), { subscription, payload })
}

export const jobQuerySchema = z.object({
  params: z.object({
    current: z.coerce.number().default(1),
    pageSize: z.coerce.number().default(20),
    name: z.string().trim().optional(),
    id: z.string().trim().optional(),
  }),
})

export async function getJobs({ params }: z.infer<typeof jobQuerySchema>) {
  const limit = params.pageSize
  const offset = (params.current - 1) * params.pageSize
  const jobs = await notificationQueue.getJobs([])

  const filteredJobs = jobs
    .filter(j => {
      if (params.name) {
        return j.name.includes(params.name)
      }
      if (params.id) {
        return j.id?.includes(params.id)
      }
      return true
    })
    .slice(offset, offset + limit)

  return { data: filteredJobs, total: jobs.length }
}
