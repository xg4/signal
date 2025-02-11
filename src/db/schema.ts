import { integer, sqliteTable, text, unique } from 'drizzle-orm/sqlite-core'

// 活动表
export const events = sqliteTable(
  'events',
  {
    id: integer('id').primaryKey(),
    name: text('name').notNull(),
    description: text('description'),
    dayOfWeek: integer('day_of_week').notNull(), // 0-6 表示周日到周六
    startTime: text('start_time').notNull(),
    durationMinutes: integer('duration_minutes').default(0),
    notifyMinutes: text('notify_minutes', { mode: 'json' }).$type<number[]>().notNull().default([]),
    locations: text('locations', { mode: 'json' }).$type<string[]>().notNull().default([]),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .$default(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .notNull()
      .$default(() => new Date())
      .$onUpdate(() => new Date()),
  },
  t => [unique().on(t.name, t.dayOfWeek, t.startTime)],
)

// 订阅表
export const subscriptions = sqliteTable('subscriptions', {
  id: integer('id').primaryKey(),
  endpoint: text('endpoint').notNull(),
  auth: text('auth').notNull(),
  p256dh: text('p256dh').notNull(),
  deviceCode: text('device_code').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$default(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .$default(() => new Date())
    .$onUpdate(() => new Date()),
})

// 用户表
export const users = sqliteTable('users', {
  id: integer('id').primaryKey(),
  username: text('username').notNull().unique(),
  password: text('password').notNull(),
  nickname: text('nickname'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$default(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .$default(() => new Date())
    .$onUpdate(() => new Date()),
})
