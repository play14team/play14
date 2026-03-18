// Types and constants for schedule management
// This file can be imported by both client and server components

export const DAYS_OF_WEEK = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const

export type DayOfWeek = (typeof DAYS_OF_WEEK)[number]

export interface Timeslot {
  id?: number
  time: string // HH:mm format
  description: string
}

export interface TimetableDay {
  id?: number
  day: DayOfWeek
  description: string
  timeslots: Timeslot[]
}

export interface ActionResult<T = void> {
  success: boolean
  data?: T
  error?: string
}
