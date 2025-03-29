import dayjs, { Dayjs } from 'dayjs'
import { isNil } from 'lodash-es'
import type { z } from 'zod'
import type { recurrenceTypeSchema } from '../types'

export const SECONDS_A_MINUTE = 60
export const SECONDS_A_HOUR = SECONDS_A_MINUTE * 60
export const SECONDS_A_DAY = SECONDS_A_HOUR * 24
export const SECONDS_A_WEEK = SECONDS_A_DAY * 7

export const MILLISECONDS_A_SECOND = 1e3
export const MILLISECONDS_A_MINUTE = SECONDS_A_MINUTE * MILLISECONDS_A_SECOND
export const MILLISECONDS_A_HOUR = SECONDS_A_HOUR * MILLISECONDS_A_SECOND
export const MILLISECONDS_A_DAY = SECONDS_A_DAY * MILLISECONDS_A_SECOND
export const MILLISECONDS_A_WEEK = SECONDS_A_WEEK * MILLISECONDS_A_SECOND

export function isSameDate(a?: Date | null, b?: Date | null) {
  if ([a, b].every(isNil)) {
    return true
  }
  if ([a, b].every(Boolean)) {
    return dayjs(a).isSame(b, 'days')
  }
  return false
}

const recurrenceTypeMap = {
  daily: 'day',
  weekly: 'week',
  monthly: 'month',
} as const

export function getNextTime(d: Dayjs, type: z.infer<typeof recurrenceTypeSchema>, interval = 1) {
  const now = dayjs()
  const unit = recurrenceTypeMap[type]

  let nextTime = d

  while (!nextTime.isAfter(now)) {
    nextTime = nextTime.add(interval, unit)
  }

  return nextTime
}
