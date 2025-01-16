export type Event = {
  id: number
  name: string
  description: string | null
  dayOfWeek: number
  startTime: string
  durationMinutes: number
  notifyMinutes: number[]
  locations: string[]

  startsAt: Date
  endsAt: Date
}

export type EventItem = Omit<Event, 'startsAt' | 'endsAt'>
