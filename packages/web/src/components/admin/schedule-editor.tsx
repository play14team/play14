"use client"

import { useState } from "react"
import {
  DAYS_OF_WEEK,
  type DayOfWeek,
  type TimetableDay,
  type Timeslot,
} from "@/app/(admin)/admin/events/[slug]/schedule.types"

interface Props {
  schedule: TimetableDay[]
  onChange: (schedule: TimetableDay[]) => void
}

interface EditingDay {
  index: number | null // null = adding new
  day: DayOfWeek
  description: string
  timeslots: Timeslot[]
}

export default function ScheduleEditor({ schedule, onChange }: Props) {
  const [editing, setEditing] = useState<EditingDay | null>(null)
  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set())
  const [error, setError] = useState<string | null>(null)

  const usedDays = new Set(schedule.map((d) => d.day))
  const availableDays = DAYS_OF_WEEK.filter((d) => !usedDays.has(d) || editing?.day === d)

  const toggleExpanded = (index: number) => {
    const newExpanded = new Set(expandedDays)
    if (newExpanded.has(index)) {
      newExpanded.delete(index)
    } else {
      newExpanded.add(index)
    }
    setExpandedDays(newExpanded)
  }

  const startAdding = () => {
    const nextAvailableDay = DAYS_OF_WEEK.find((d) => !usedDays.has(d))
    if (!nextAvailableDay) {
      setError("All days of the week are already scheduled")
      return
    }
    setEditing({
      index: null,
      day: nextAvailableDay,
      description: "",
      timeslots: [{ time: "09:00", description: "Start" }],
    })
    setError(null)
  }

  const startEditing = (index: number) => {
    const day = schedule[index]
    setEditing({
      index,
      day: day.day,
      description: day.description,
      timeslots: [...day.timeslots],
    })
    setExpandedDays(new Set([index]))
    setError(null)
  }

  const cancelEditing = () => {
    setEditing(null)
    setError(null)
  }

  const addTimeslot = () => {
    if (!editing) return
    const lastTime = editing.timeslots[editing.timeslots.length - 1]?.time || "09:00"
    // Add 1 hour to the last time
    const [hours, minutes] = lastTime.split(":").map(Number)
    const newHours = Math.min(23, hours + 1)
    const newTime = `${String(newHours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`

    setEditing({
      ...editing,
      timeslots: [...editing.timeslots, { time: newTime, description: "" }],
    })
  }

  const updateTimeslot = (index: number, field: "time" | "description", value: string) => {
    if (!editing) return
    const newTimeslots = [...editing.timeslots]
    newTimeslots[index] = { ...newTimeslots[index], [field]: value }
    setEditing({ ...editing, timeslots: newTimeslots })
  }

  const removeTimeslot = (index: number) => {
    if (!editing) return
    if (editing.timeslots.length <= 1) {
      setError("A day must have at least one timeslot")
      return
    }
    const newTimeslots = editing.timeslots.filter((_, i) => i !== index)
    setEditing({ ...editing, timeslots: newTimeslots })
  }

  const handleSave = () => {
    if (!editing) return

    // Validate
    if (!editing.description.trim()) {
      setError("Day description is required")
      return
    }

    for (let i = 0; i < editing.timeslots.length; i++) {
      const slot = editing.timeslots[i]
      if (!slot.time) {
        setError(`Time is required for timeslot ${i + 1}`)
        return
      }
      if (!slot.description.trim()) {
        setError(`Description is required for timeslot ${i + 1}`)
        return
      }
    }

    // Sort timeslots by time
    const sortedTimeslots = [...editing.timeslots].sort((a, b) => a.time.localeCompare(b.time))

    const newDay: TimetableDay = {
      day: editing.day,
      description: editing.description.trim(),
      timeslots: sortedTimeslots.map((s) => ({
        time: s.time,
        description: s.description.trim(),
      })),
    }

    let updatedDays: TimetableDay[]
    if (editing.index === null) {
      updatedDays = [...schedule, newDay]
    } else {
      updatedDays = schedule.map((d, i) => (i === editing.index ? newDay : d))
    }

    // Sort days by day of week
    updatedDays.sort((a, b) => DAYS_OF_WEEK.indexOf(a.day) - DAYS_OF_WEEK.indexOf(b.day))

    onChange(updatedDays)
    setEditing(null)
    setError(null)
  }

  const handleDelete = (index: number) => {
    if (!confirm("Are you sure you want to remove this day from the schedule?")) {
      return
    }
    onChange(schedule.filter((_, i) => i !== index))
  }

  const formatTime = (time: string) => {
    return time.substring(0, 5)
  }

  return (
    <div className="schedule-editor">
      {error && (
        <div className="admin-alert admin-alert-error">
          <i className="bx bx-error-circle"></i>
          {error}
        </div>
      )}

      {/* Existing days */}
      <div className="schedule-days-list">
        {schedule.map((day, index) => (
          <div key={index} className="schedule-day-card">
            {editing?.index === index ? (
              // Editing mode
              <div className="schedule-day-form">
                <div className="admin-form-row">
                  <div className="admin-form-group">
                    <label>Day *</label>
                    <select
                      value={editing.day}
                      onChange={(e) => setEditing({ ...editing, day: e.target.value as DayOfWeek })}
                      className="admin-select"
                    >
                      {availableDays.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="admin-form-group" style={{ flex: 2 }}>
                    <label>Description *</label>
                    <input
                      type="text"
                      value={editing.description}
                      onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                      className="admin-input"
                      placeholder="e.g., Main event day"
                    />
                  </div>
                </div>

                <div className="schedule-timeslots">
                  <label>Timeslots</label>
                  {editing.timeslots.map((slot, slotIndex) => (
                    <div key={slotIndex} className="schedule-timeslot-row">
                      <input
                        type="time"
                        value={slot.time}
                        onChange={(e) => updateTimeslot(slotIndex, "time", e.target.value)}
                        className="admin-input time-input"
                      />
                      <input
                        type="text"
                        value={slot.description}
                        onChange={(e) => updateTimeslot(slotIndex, "description", e.target.value)}
                        className="admin-input"
                        placeholder="Activity description"
                      />
                      <button
                        type="button"
                        onClick={() => removeTimeslot(slotIndex)}
                        className="admin-btn admin-btn-icon admin-btn-danger"
                        title="Remove timeslot"
                        disabled={editing.timeslots.length <= 1}
                      >
                        <i className="bx bx-x"></i>
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addTimeslot}
                    className="admin-btn admin-btn-secondary admin-btn-sm"
                  >
                    <i className="bx bx-plus"></i>
                    Add Timeslot
                  </button>
                </div>

                <div className="schedule-day-actions">
                  <button
                    type="button"
                    onClick={handleSave}
                    className="admin-btn admin-btn-primary admin-btn-sm"
                  >
                    Done
                  </button>
                  <button
                    type="button"
                    onClick={cancelEditing}
                    className="admin-btn admin-btn-secondary admin-btn-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              // View mode
              <>
                <div
                  className="schedule-day-header"
                  onClick={() => toggleExpanded(index)}
                  style={{ cursor: "pointer" }}
                >
                  <div className="schedule-day-info">
                    <span className="schedule-day-name">{day.day}</span>
                    <span className="schedule-day-description">{day.description}</span>
                    <span className="schedule-day-slots-count">
                      {day.timeslots?.length || 0} activities
                    </span>
                  </div>
                  <div className="schedule-day-toggle">
                    <i className={`bx ${expandedDays.has(index) ? "bx-chevron-up" : "bx-chevron-down"}`}></i>
                  </div>
                </div>

                {expandedDays.has(index) && (
                  <div className="schedule-day-content">
                    <div className="schedule-timeslots-list">
                      {day.timeslots?.map((slot, slotIndex) => (
                        <div key={slotIndex} className="schedule-timeslot-item">
                          <span className="schedule-timeslot-time">{formatTime(slot.time)}</span>
                          <span className="schedule-timeslot-description">{slot.description}</span>
                        </div>
                      ))}
                    </div>
                    <div className="schedule-day-actions">
                      <button
                        type="button"
                        onClick={() => startEditing(index)}
                        className="admin-btn admin-btn-secondary admin-btn-sm"
                        disabled={editing !== null}
                      >
                        <i className="bx bx-edit"></i>
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(index)}
                        className="admin-btn admin-btn-danger admin-btn-sm"
                        disabled={editing !== null}
                      >
                        <i className="bx bx-trash"></i>
                        Remove
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>

      {/* Add new day form */}
      {editing?.index === null && (
        <div className="schedule-day-card schedule-day-new">
          <div className="schedule-day-form">
            <h4>Add Day to Schedule</h4>
            <div className="admin-form-row">
              <div className="admin-form-group">
                <label>Day *</label>
                <select
                  value={editing.day}
                  onChange={(e) => setEditing({ ...editing, day: e.target.value as DayOfWeek })}
                  className="admin-select"
                >
                  {availableDays.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
              <div className="admin-form-group" style={{ flex: 2 }}>
                <label>Description *</label>
                <input
                  type="text"
                  value={editing.description}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                  className="admin-input"
                  placeholder="e.g., Workshop day, Main event, etc."
                />
              </div>
            </div>

            <div className="schedule-timeslots">
              <label>Timeslots</label>
              {editing.timeslots.map((slot, slotIndex) => (
                <div key={slotIndex} className="schedule-timeslot-row">
                  <input
                    type="time"
                    value={slot.time}
                    onChange={(e) => updateTimeslot(slotIndex, "time", e.target.value)}
                    className="admin-input time-input"
                  />
                  <input
                    type="text"
                    value={slot.description}
                    onChange={(e) => updateTimeslot(slotIndex, "description", e.target.value)}
                    className="admin-input"
                    placeholder="Activity description"
                  />
                  <button
                    type="button"
                    onClick={() => removeTimeslot(slotIndex)}
                    className="admin-btn admin-btn-icon admin-btn-danger"
                    title="Remove timeslot"
                    disabled={editing.timeslots.length <= 1}
                  >
                    <i className="bx bx-x"></i>
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addTimeslot}
                className="admin-btn admin-btn-secondary admin-btn-sm"
              >
                <i className="bx bx-plus"></i>
                Add Timeslot
              </button>
            </div>

            <div className="schedule-day-actions">
              <button
                type="button"
                onClick={handleSave}
                className="admin-btn admin-btn-primary admin-btn-sm"
              >
                Add Day
              </button>
              <button
                type="button"
                onClick={cancelEditing}
                className="admin-btn admin-btn-secondary admin-btn-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add button */}
      {!editing && availableDays.length > 0 && (
        <button type="button" onClick={startAdding} className="admin-btn admin-btn-secondary">
          <i className="bx bx-plus"></i>
          Add Day to Schedule
        </button>
      )}

      {schedule.length === 0 && !editing && (
        <p className="schedule-empty">
          No schedule defined yet. Add days and timeslots to create the event schedule.
        </p>
      )}
    </div>
  )
}
