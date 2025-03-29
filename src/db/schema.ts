import { relations } from 'drizzle-orm'
import { boolean, customType, index, integer, pgEnum, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core'

const timestamps = {
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
  deletedAt: timestamp('deleted_at'),
}

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
  ...timestamps,
})

export const events = pgTable(
  'events',
  {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    description: text('description'),
    locations: text('locations').array(),
    startTime: timestamp('start_time').notNull(),
    durationMinutes: integer('duration_minutes').default(0).notNull(),
    ...timestamps,
  },
  t => [index().on(t.startTime, t.name)],
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
    ...timestamps,
  },
  t => [index().on(t.deviceCode)],
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
    ...timestamps,
  },
  t => [index().on(t.sent, t.scheduledAt), index().on(t.eventId)],
)

export const recurrenceTypeEnum = pgEnum('recurrence_type', ['daily', 'weekly', 'monthly'])

export const recurrenceRules = pgTable('recurrence_rules', {
  id: serial('id').primaryKey(),
  eventId: integer('event_id')
    .references(() => events.id)
    .notNull(),
  recurrenceType: recurrenceTypeEnum('recurrence_type').notNull(),
  recurrenceInterval: integer('recurrence_interval').default(1).notNull(),
  recurrenceEndDate: timestamp('recurrence_end_date'),
  ...timestamps,
})

export const eventsRelations = relations(events, ({ many, one }) => ({
  reminders: many(reminders),
  recurrenceRules: one(recurrenceRules),
}))

export const remindersRelations = relations(reminders, ({ one }) => ({
  event: one(events, {
    fields: [reminders.eventId],
    references: [events.id],
  }),
}))

export const recurrenceRulesRelations = relations(recurrenceRules, ({ one }) => ({
  event: one(events, {
    fields: [recurrenceRules.eventId],
    references: [events.id],
  }),
}))
