import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { z } from 'zod'
import { events, recurrenceRules, recurrenceTypeEnum, reminders, subscriptions } from '../db/schema'

export type RecurrenceRule = typeof recurrenceRules.$inferSelect

export type RecurrenceJob = { eventId: number; id: number }

export type Event = typeof events.$inferSelect

export type Subscription = typeof subscriptions.$inferSelect

export const recurrenceTypeSchema = createSelectSchema(recurrenceTypeEnum)

export const omitDefaultModel = { id: true, createdAt: true, updatedAt: true, deletedAt: true } as const

const dateLike = z.union([
  z.string().datetime({
    offset: true,
    local: true,
  }),
  z.date(),
])
const dateLikeToDate = dateLike.pipe(z.coerce.date())

export const recurrenceRulesInsetSchema = createInsertSchema(recurrenceRules, {
  recurrenceType: recurrenceTypeSchema.optional(),
  recurrenceInterval: z.coerce.number().default(1),
  recurrenceEndDate: dateLikeToDate.optional().nullable(),
}).omit({ ...omitDefaultModel, eventId: true })

export const eventInsetSchema = createInsertSchema(events, {
  startTime: dateLikeToDate,
})
  .omit(omitDefaultModel)
  .merge(
    z.object({
      reminderTimes: z.coerce.number().array().optional(),
    }),
  )
  .merge(recurrenceRulesInsetSchema)

export const eventBatchInsetSchema = eventInsetSchema.array().nonempty()

export const eventUpdateSchema = eventInsetSchema.partial()

export type Reminder = typeof reminders.$inferSelect
