"use client"

import SponsorEditor from "@/components/admin/sponsor-editor"
import OrganizerSelect, {
  SelectedOrganizer,
} from "@/components/admin/organizer-select"
import type { EventForEdit, OrganizerOption } from "../event-edit.action"
import type { Sponsorship } from "../sponsor.action"

interface TeamSponsorsTabProps {
  organizers: OrganizerOption[]
  eventHosts: EventForEdit["hosts"]
  eventMentors: EventForEdit["mentors"]
  selectedHostIds: string[]
  setSelectedHostIds: (ids: string[]) => void
  selectedMentorIds: string[]
  setSelectedMentorIds: (ids: string[]) => void
  sponsorships: Sponsorship[]
  onSponsorshipsChange: (sponsorships: Sponsorship[]) => void
}

export default function TeamSponsorsTab({
  organizers,
  eventHosts,
  eventMentors,
  selectedHostIds,
  setSelectedHostIds,
  selectedMentorIds,
  setSelectedMentorIds,
  sponsorships,
  onSponsorshipsChange,
}: TeamSponsorsTabProps) {
  // Helper to find organizer data (from organizers list or event data)
  const findOrganizer = (
    id: string,
    fallbackList?: { documentId: string; name: string }[]
  ): OrganizerOption | undefined => {
    const fromOrganizers = organizers.find((o) => o.documentId === id)
    if (fromOrganizers) return fromOrganizers

    const fromFallback = fallbackList?.find((o) => o.documentId === id)
    if (fromFallback) {
      return {
        documentId: fromFallback.documentId,
        name: fromFallback.name,
        position: "",
        avatar: null,
      }
    }

    return undefined
  }

  return (
    <>
      {/* Organizers Section */}
      <div className="admin-form-section">
        <h2>Organizers</h2>
        <p className="admin-form-section-description">
          Add hosts and mentors to help organize this event.
        </p>

        {/* Hosts */}
        <div className="admin-form-group">
          <label>Hosts</label>
          <div className="organizer-selector">
            <OrganizerSelect
              organizers={organizers}
              selectedIds={selectedHostIds}
              onSelect={(id) => setSelectedHostIds([...selectedHostIds, id])}
              placeholder="Add a host..."
            />
            {selectedHostIds.length > 0 && (
              <ul className="organizer-list">
                {selectedHostIds.map((id) => (
                  <SelectedOrganizer
                    key={id}
                    organizer={findOrganizer(id, eventHosts)}
                    onRemove={() =>
                      setSelectedHostIds(
                        selectedHostIds.filter((hId) => hId !== id)
                      )
                    }
                  />
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Mentors */}
        <div className="admin-form-group">
          <label>Mentors</label>
          <div className="organizer-selector">
            <OrganizerSelect
              organizers={organizers}
              selectedIds={selectedMentorIds}
              onSelect={(id) =>
                setSelectedMentorIds([...selectedMentorIds, id])
              }
              placeholder="Add a mentor..."
              filterFn={(o) =>
                o.position === "Mentor" || o.position === "Founder"
              }
            />
            {selectedMentorIds.length > 0 && (
              <ul className="organizer-list">
                {selectedMentorIds.map((id) => (
                  <SelectedOrganizer
                    key={id}
                    organizer={findOrganizer(id, eventMentors)}
                    onRemove={() =>
                      setSelectedMentorIds(
                        selectedMentorIds.filter((mId) => mId !== id)
                      )
                    }
                  />
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Sponsors Section */}
      <div className="admin-form-section">
        <h2>Sponsors</h2>
        <p className="admin-form-section-description">
          Manage sponsors for this event organized by category (Gold, Silver,
          etc.).
        </p>
        <SponsorEditor
          sponsorships={sponsorships}
          onChange={onSponsorshipsChange}
        />
      </div>
    </>
  )
}
