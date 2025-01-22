import { integer, pgTable, serial, text, time, timestamp, unique } from 'drizzle-orm/pg-core'

// 活动表
export const events = pgTable(
  'events',
  {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    description: text('description'),
    dayOfWeek: integer('day_of_week').notNull(), // 0-6 表示周日到周六
    startTime: time('start_time').notNull(),
    durationMinutes: integer('duration_minutes').notNull(),
    notifyMinutes: integer('notify_minutes').array().notNull().default([]),
    locations: text('locations').array().notNull().default([]),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at')
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  t => ({
    unique: unique().on(t.name, t.dayOfWeek, t.startTime),
  }),
)

// 订阅表
export const subscriptions = pgTable('subscriptions', {
  id: serial('id').primaryKey(),
  endpoint: text('endpoint').notNull(),
  auth: text('auth').notNull(),
  p256dh: text('p256dh').notNull(),
  deviceCode: text('device_code').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at')
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
})

// 用户表
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: text('username').notNull().unique(),
  password: text('password').notNull(), // 存储加密后的密码
  nickname: text('nickname'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at')
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
})
