/**
 * Prompt templates for Gemini AI content generation
 */

import type { EventContext } from "./types"

/**
 * Format event date range for display
 */
function formatDateRange(start: string, end: string): string {
  const startDate = new Date(start)
  const endDate = new Date(end)

  const options: Intl.DateTimeFormatOptions = {
    month: "long",
    day: "numeric",
    year: "numeric",
  }

  if (startDate.toDateString() === endDate.toDateString()) {
    return startDate.toLocaleDateString("en-US", options)
  }

  return `${startDate.toLocaleDateString("en-US", options)} - ${endDate.toLocaleDateString("en-US", options)}`
}

/**
 * Generate announcement prompt for a newly published event
 */
export function createAnnouncementPrompt(event: EventContext): string {
  const dateRange = formatDateRange(event.start, event.end)
  const hosts = event.hosts.map((h) => `${h.firstName} ${h.lastName}`).join(", ")

  return `Create an engaging LinkedIn post announcing a #play14 event with the following details:

Event: ${event.name}
Location: ${event.location.name}, ${event.location.city}, ${event.location.country}
Dates: ${dateRange}
Hosts: ${hosts}
${event.description ? `Description: ${event.description}` : ""}

Requirements:
- Write in an enthusiastic, welcoming tone
- Keep it professional but approachable
- Highlight the unique aspects of this location and event
- Encourage agile practitioners and game facilitators to join
- Include 2-3 relevant hashtags including #play14
- Keep the post under 250 words
- End with a clear call-to-action to learn more or register

Write only the post text, no additional commentary.`
}

/**
 * Generate 30-day reminder prompt
 */
export function create30DayReminderPrompt(event: EventContext): string {
  const dateRange = formatDateRange(event.start, event.end)

  return `Create an exciting LinkedIn post reminding people about a #play14 event starting in 30 days:

Event: ${event.name}
Location: ${event.location.city}, ${event.location.country}
Dates: ${dateRange}

Requirements:
- Create urgency and excitement (30 days away!)
- Emphasize early bird registration or planning ahead
- Mention the unique opportunity to learn agile games
- Keep it concise (under 200 words)
- Include 2-3 hashtags including #play14
- End with a call-to-action to register or save the date

Write only the post text, no additional commentary.`
}

/**
 * Generate 7-day reminder prompt
 */
export function create7DayReminderPrompt(event: EventContext): string {
  const dateRange = formatDateRange(event.start, event.end)

  return `Create an urgent LinkedIn post for a #play14 event starting in ONE WEEK:

Event: ${event.name}
Location: ${event.location.city}, ${event.location.country}
Dates: ${dateRange}

Requirements:
- Create strong urgency (only 7 days left!)
- Emphasize last chance to register
- Brief and punchy tone
- Keep it very concise (under 150 words)
- Include 2-3 hashtags including #play14
- Strong call-to-action to register NOW

Write only the post text, no additional commentary.`
}
