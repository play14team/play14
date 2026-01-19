"use client"

import EventImageManager from "@/components/admin/event-image-manager"
import ScheduleEditor from "@/components/admin/schedule-editor"
import SimpleEditor from "@/components/ui/simple-editor"
import type { EventForEdit } from "../event-edit.action"
import type { TimetableDay } from "../schedule.types"

interface ContentTabProps {
  description: string
  setDescription: (value: string) => void
  eventSlug: string
  eventName: string
  defaultImage: EventForEdit["defaultImage"]
  galleryImages: EventForEdit["images"]
  schedule: TimetableDay[]
  onScheduleChange: (schedule: TimetableDay[]) => void
  onImageUpdate: () => void
}

export default function ContentTab({
  description,
  setDescription,
  eventSlug,
  eventName,
  defaultImage,
  galleryImages,
  schedule,
  onScheduleChange,
  onImageUpdate,
}: ContentTabProps) {
  return (
    <>
      {/* Description Section */}
      <div className="admin-form-section">
        <h2>Description</h2>

        <div className="admin-form-group">
          <SimpleEditor
            content={description}
            onChange={setDescription}
            placeholder="Add a description for this event..."
          />
        </div>
      </div>

      {/* Images Section */}
      <div className="admin-form-section">
        <h2>Event Images</h2>
        <p className="admin-form-section-description">
          Upload or select images for the event. The default image appears on event cards and
          listings.
        </p>
        <EventImageManager
          eventSlug={eventSlug}
          eventName={eventName}
          defaultImage={defaultImage}
          galleryImages={galleryImages || []}
          onUpdate={onImageUpdate}
        />
      </div>

      {/* Schedule Section */}
      <div className="admin-form-section">
        <h2>Event Schedule</h2>
        <p className="admin-form-section-description">
          Define the timetable for each day of the event with activities and timeslots.
        </p>
        <ScheduleEditor schedule={schedule} onChange={onScheduleChange} />
      </div>
    </>
  )
}
