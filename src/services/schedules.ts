import { CronJob } from 'cron'
import dayjs from 'dayjs'
import { and, eq, gte, lte } from 'drizzle-orm'
import { HTTPException } from 'hono/http-exception'
import { db } from '../db'
import { events, reminders, subscriptions } from '../db/schema'
import { logger } from '../middlewares/logger'
import type { Reminder } from '../types'
import { sendNotification } from '../utils/notifications'

const log = logger.child({
  module: 'schedules',
})

// Store active jobs
const activeJobs: Map<number, CronJob> = new Map()

// Initialize the scheduler
export async function initScheduler() {
  log.info('Initializing scheduler...')

  new CronJob(
    '0 4 * * *',
    () => {
      updateSchedule()
    },
    null, // onComplete
    true, // start
    null, // timezone
    null, // context
    true, // runOnInit
    8, // utcOffset
  )
}

// Update the schedule based on current reminders
export async function updateSchedule() {
  try {
    log.info('Updating schedule...')

    // Clear existing jobs
    for (const [, job] of activeJobs) {
      job.stop()
    }
    activeJobs.clear()

    // Get upcoming, unsent reminders
    const now = dayjs()
    const upcomingReminders = await db.query.reminders.findMany({
      where: and(
        eq(reminders.sent, false),
        gte(reminders.scheduledAt, now.toDate()),
        lte(reminders.scheduledAt, now.add(1, 'day').toDate()),
      ),
      with: {
        event: true,
      },
      orderBy: (reminders, { asc }) => [asc(reminders.scheduledAt)],
    })

    log.info(`Found ${upcomingReminders.length} upcoming reminders`)

    // Schedule each reminder
    for (const reminder of upcomingReminders) {
      scheduleReminder(reminder)
    }

    return activeJobs
  } catch (error) {
    log.error('Error updating schedule:', error)
    throw error
  }
}

// Schedule a single reminder
function scheduleReminder(reminder: Reminder) {
  try {
    const { id, scheduledAt } = reminder

    // Check if the scheduled time is in the future
    const now = new Date()
    if (scheduledAt <= now) {
      log.info(`Reminder ${id} is in the past, skipping`)
      return
    }

    log.info(`Scheduling reminder ${id} for ${dayjs(scheduledAt).tz('Asia/Shanghai').format('YYYY-MM-DD HH:mm:ss')}`)

    // Create a cron job for the specific time
    const job = new CronJob(
      scheduledAt,
      () => processReminder(reminder),
      null, // onComplete
      true, // start
      undefined, // timezone
      null, // context
      false, // runOnInit
      0, // utcOffset
    )

    activeJobs.set(id, job)
    log.info(`Scheduled reminder ${id}`)
  } catch (error) {
    log.error(`Error scheduling reminder ${reminder.id}:`, error)
  }
}

// Process a reminder when it's time
async function processReminder(reminder: Reminder) {
  try {
    const { id, eventId } = reminder
    log.info(`Processing reminder ${id} for event ${eventId}`)

    // Get event details
    const event = await db.query.events.findFirst({
      where: eq(events.id, eventId),
    })

    if (!event) {
      log.info(`Event ${eventId} not found, marking reminder as sent`)
      await markReminderAsSent(id)
      return
    }

    // Get user subscriptions
    const userSubscriptions = await db.query.subscriptions.findMany({})

    if (userSubscriptions.length === 0) {
      log.info(`No subscriptions found, marking reminder as sent`)
      await markReminderAsSent(id)
      return
    }

    // Send notifications to all subscriptions
    const notificationPromises = userSubscriptions.map(async s => {
      const diff = dayjs(event.startTime).diff(dayjs(), 'minute')

      const title = [event.name, (diff <= 1 ? '' : dayjs(event.startTime).fromNow()) + '即将开始'].join(' - ')
      const body = event.locations ? event.locations.join(' - ') : event.description || ''
      const payload = {
        title,
        body,
        // data: {
        //   eventId: event.id,
        //   url: `/events/${event.id}`,
        // },
      }
      try {
        return sendNotification(s, payload)
      } catch (err) {
        if (err instanceof HTTPException) {
          if ([410, 404].includes(err.status)) {
            await db.delete(subscriptions).where(eq(subscriptions.id, s.id))
          }
        }
      }
    })

    await Promise.allSettled(notificationPromises)

    // Mark reminder as sent
    await markReminderAsSent(id)

    log.info(`Reminder ${id} processed successfully`)
  } catch (error) {
    log.error(`Error processing reminder ${reminder.id}:`, error)
  }
}

// Mark a reminder as sent
async function markReminderAsSent(reminderId: number) {
  try {
    await db.update(reminders).set({ sent: true }).where(eq(reminders.id, reminderId))

    // Remove from active jobs
    if (activeJobs.has(reminderId)) {
      activeJobs.delete(reminderId)
    }
  } catch (error) {
    log.error(`Error marking reminder ${reminderId} as sent:`, error)
  }
}
