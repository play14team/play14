import type { Metadata } from "next"
import { requireOrganizer } from "@/libs/auth"
import { getLocations, getVenues } from "./event-create.action"
import EventCreateForm from "./event-create-form"

export const metadata: Metadata = {
  title: "Create Event | #play14",
  robots: "noindex, nofollow",
}

export default async function CreateEventPage() {
  await requireOrganizer("/admin/events/create")

  const [locations, venues] = await Promise.all([getLocations(), getVenues()])

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1>Create event</h1>
        <p>Set up a new #play14 event with default schedule and tickets</p>
      </div>

      <EventCreateForm locations={locations} venues={venues} />
    </div>
  )
}
