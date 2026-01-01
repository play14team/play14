/**
 * Default schedule templates for #play14 events
 * Based on the Nancy 2026 event pattern
 */

interface TimeSlot {
  time: string
  description: string
}

interface TimetableDay {
  day: string
  description: string
  timeslots: TimeSlot[]
}

// Opening evening schedule (first day)
// Note: Strapi time fields require HH:mm:ss.SSS format
const openingEvening: TimeSlot[] = [
  { time: "18:00:00.000", description: "Ice breakers" },
  { time: "20:00:00.000", description: "Dinner & Mingle" },
  { time: "22:00:00.000", description: "Beer at pub" },
]

// Main day 1 schedule (second day)
const mainDay1: TimeSlot[] = [
  { time: "08:30:00.000", description: "Breakfast" },
  { time: "09:00:00.000", description: "Warm-up" },
  { time: "09:30:00.000", description: "Marketplace" },
  { time: "10:30:00.000", description: "Sessions" },
  { time: "12:30:00.000", description: "Lunch" },
  { time: "14:00:00.000", description: "Sessions" },
  { time: "18:00:00.000", description: "Retrospective" },
  { time: "19:00:00.000", description: "Pizza & Beers" },
]

// Main day 2 schedule (third day - closing)
const mainDay2: TimeSlot[] = [
  { time: "08:30:00.000", description: "Breakfast" },
  { time: "09:00:00.000", description: "Warm-up" },
  { time: "09:30:00.000", description: "Marketplace" },
  { time: "10:00:00.000", description: "Sessions" },
  { time: "12:30:00.000", description: "Lunch" },
  { time: "13:30:00.000", description: "Sessions" },
  { time: "16:00:00.000", description: "Retrospective" },
  { time: "17:00:00.000", description: "Farewell" },
]

/**
 * Thursday to Saturday schedule template
 * Thu evening -> Fri full day -> Sat full day (ends 5PM)
 */
export const thuSatSchedule: TimetableDay[] = [
  {
    day: "Thursday",
    description: "Opening Evening",
    timeslots: openingEvening,
  },
  {
    day: "Friday",
    description: "Main Day 1",
    timeslots: mainDay1,
  },
  {
    day: "Saturday",
    description: "Main Day 2",
    timeslots: mainDay2,
  },
]

/**
 * Friday to Sunday schedule template
 * Fri evening -> Sat full day -> Sun full day (ends 5PM)
 */
export const friSunSchedule: TimetableDay[] = [
  {
    day: "Friday",
    description: "Opening Evening",
    timeslots: openingEvening,
  },
  {
    day: "Saturday",
    description: "Main Day 1",
    timeslots: mainDay1,
  },
  {
    day: "Sunday",
    description: "Main Day 2",
    timeslots: mainDay2,
  },
]

/**
 * Get schedule template by name
 */
export function getScheduleTemplate(
  template: "thu-sat" | "fri-sun"
): TimetableDay[] {
  return template === "fri-sun" ? friSunSchedule : thuSatSchedule
}

/**
 * Day name map for timetable component
 */
const dayNames = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
]

/**
 * Generate timetable dynamically based on actual start and end dates
 * - First day: Opening evening schedule
 * - Middle days: Full day schedule (main day 1)
 * - Last day: Closing day schedule (main day 2)
 */
export function generateTimetable(
  startDate: Date,
  endDate: Date
): TimetableDay[] {
  const timetable: TimetableDay[] = []

  // Normalize dates to start of day for comparison
  const start = new Date(startDate)
  const end = new Date(endDate)

  // Calculate number of days
  const msPerDay = 24 * 60 * 60 * 1000
  const totalDays = Math.round((end.getTime() - start.getTime()) / msPerDay) + 1

  // Iterate through each day
  const current = new Date(start)
  for (let dayIndex = 0; dayIndex < totalDays; dayIndex++) {
    const dayName = dayNames[current.getDay()]
    const isFirstDay = dayIndex === 0
    const isLastDay = dayIndex === totalDays - 1

    if (isFirstDay) {
      // Opening evening
      timetable.push({
        day: dayName,
        description: "Opening Evening",
        timeslots: openingEvening,
      })
    } else if (isLastDay) {
      // Closing day
      timetable.push({
        day: dayName,
        description: "Main Day - Closing",
        timeslots: mainDay2,
      })
    } else {
      // Full middle day
      timetable.push({
        day: dayName,
        description: `Main Day ${dayIndex}`,
        timeslots: mainDay1,
      })
    }

    // Move to next day
    current.setDate(current.getDate() + 1)
  }

  return timetable
}
