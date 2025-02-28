import { relations } from 'drizzle-orm'
import { boolean, customType, index, integer, pgEnum, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core'

export const userRoleEnum = pgEnum('user_role', ['guest', 'user', 'admin'])

const citext = customType<{ data: string }>({
  dataType() {
    return 'citext'
  },
})

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: citext().notNull().unique(),
  password: text('password').notNull(),
  nickname: text('nickname'),
  role: userRoleEnum('role').default('user').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
})

export const events = pgTable(
  'events',
  {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    description: text('description'),
    locations: text('locations').array(),
    startTime: timestamp('start_time').notNull(),
    endTime: timestamp('end_time'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  t => [index().on(t.startTime, t.name)],
)

export const reminders = pgTable(
  'reminders',
  {
    id: serial('id').primaryKey(),
    eventId: integer('event_id')
      .references(() => events.id)
      .notNull(),
    minutesBefore: integer('minutes_before').notNull(),
    sent: boolean('sent').default(false).notNull(),
    scheduledAt: timestamp('scheduled_at').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  t => [index().on(t.sent, t.scheduledAt), index().on(t.eventId)],
)

export const subscriptions = pgTable(
  'subscriptions',
  {
    id: serial('id').primaryKey(),
    endpoint: text('endpoint').notNull(),
    p256dh: text('p256dh').notNull(),
    auth: text('auth').notNull(),
    userAgent: text('user_agent'),
    deviceCode: text('device_code').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  t => [index().on(t.deviceCode)],
)

export const eventsRelations = relations(events, ({ many }) => ({
  reminders: many(reminders),
}))

export const remindersRelations = relations(reminders, ({ one }) => ({
  event: one(events, {
    fields: [reminders.eventId],
    references: [events.id],
  }),
}))
