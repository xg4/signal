import { integer, pgTable, serial, text, time } from 'drizzle-orm/pg-core'

// 活动表
export const events = pgTable('events', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  dayOfWeek: integer('day_of_week').notNull(), // 0-6 表示周日到周六
  startTime: time('start_time').notNull(),
  durationMinutes: integer('duration_minutes').notNull(),
})

// 订阅表
export const subscriptions = pgTable('subscriptions', {
  id: serial('id').primaryKey(),
  endpoint: text('endpoint').notNull(),
  auth: text('auth').notNull(),
  p256dh: text('p256dh').notNull(),
  hash: text('hash').notNull().unique(),
})
