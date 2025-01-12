export type Event = {
  startsAt: Date
  endsAt: Date
  id: number
  name: string
  description: string | null
  dayOfWeek: number
  startTime: string
  durationMinutes: number
}
