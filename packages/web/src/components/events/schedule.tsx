"use client"

import { ComponentEventsTimetable, Maybe } from "@/models/strapi"
import styles from "./schedule.module.scss"

const EventSchedule = ({
  timetable,
}: {
  timetable: Array<Maybe<ComponentEventsTimetable>>
}) => {
  const formatTime = (time: string) => {
    // Extract HH:mm from time string
    return time.substring(0, 5)
  }

  return (
    <div className={styles.schedule}>
      {timetable.map((day) => {
        if (!day) return null

        return (
          <div key={day.id} className={styles.day}>
            {/* Day Header */}
            <div className={styles.dayHeader}>
              <div className={styles.dayIcon}>
                <i className="bx bx-calendar" />
              </div>
              <h3 className={styles.dayTitle}>{day.day}</h3>
            </div>

            {/* Day Description */}
            {day.description && (
              <p className={styles.dayDescription}>{day.description}</p>
            )}

            {/* Timeline */}
            {day.timeslots && day.timeslots.length > 0 && (
              <div className={styles.timeline}>
                {day.timeslots.map((slot) => {
                  if (!slot) return null

                  return (
                    <div key={slot.id} className={styles.timeslot}>
                      <div className={styles.timeLabel}>
                        <span className={styles.time}>
                          <i className={`bx bx-time ${styles.timeIcon}`} />
                          {formatTime(slot.time)}
                        </span>
                      </div>
                      <div className={styles.timeslotContent}>
                        <p className={styles.activityName}>{slot.description}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default EventSchedule
