"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  updateEvent,
  publishEvent,
  unpublishEvent,
  type EventForEdit,
  type LocationOption,
  type VenueOption,
  type OrganizerOption,
} from "./event-edit.action"
import type { TicketType } from "./ticket-type.action"
import type { DiscountCode } from "./discount-code.action"
import type {
  StripeAccountStatus,
  HostStripeAccount,
} from "@/app/(admin)/admin/stripe/stripe-connect.action"

import EventEditTabs, { TAB_IDS, type TabId } from "./event-edit-tabs"
import EventEditActions from "./event-edit-actions"
import { useEventForm } from "./hooks/use-event-form"
import { useFormDirty, useBeforeUnload } from "@/hooks/use-form-dirty"
import { useToast } from "@/components/admin/toast"
import UnsavedChangesDialog from "@/components/admin/unsaved-changes-dialog"

import BasicsTab from "./tabs/basics-tab"
import ContentTab from "./tabs/content-tab"
import ScheduleTicketsTab from "./tabs/schedule-tickets-tab"
import TeamSponsorsTab from "./tabs/team-sponsors-tab"
import ParticipantsTab from "./tabs/participants-tab"
import MediaTab from "./tabs/media-tab"
import BudgetTab from "./tabs/budget-tab"
import ResultsTab from "./tabs/results-tab"
import FinanceTab from "./tabs/finance-tab"
import type { BudgetLineItem } from "./budget.types"
import type { ResultLineItem } from "./results.types"

interface Props {
  event: EventForEdit
  locations: LocationOption[]
  venues: VenueOption[]
  organizers: OrganizerOption[]
  hostAccounts: HostStripeAccount[]
  playerStripeAccount: StripeAccountStatus | null
  discountCodes: DiscountCode[]
  budgetItems: BudgetLineItem[]
  resultItems: ResultLineItem[]
  ticketRevenue: number
}

export default function EventEditForm({
  event,
  locations,
  venues,
  organizers,
  hostAccounts,
  playerStripeAccount,
  discountCodes,
  budgetItems: initialBudgetItems,
  resultItems: initialResultItems,
  ticketRevenue,
}: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const toast = useToast()

  // Get tab from URL params (client-side)
  const tabParam = searchParams.get("tab") as TabId | null
  const urlTab: TabId = tabParam && TAB_IDS.includes(tabParam) ? tabParam : "basics"
  const [activeTab, setActiveTab] = useState<TabId>(urlTab)

  // Sync tab state when URL changes (e.g., direct navigation)
  useEffect(() => {
    if (urlTab !== activeTab) {
      setActiveTab(urlTab)
    }
  }, [urlTab]) // eslint-disable-line react-hooks/exhaustive-deps

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [isPublished, setIsPublished] = useState(event.isPublished ?? false)

  // Budget and results state (managed separately, saved immediately via API)
  const [budgetItems, setBudgetItems] = useState<BudgetLineItem[]>(initialBudgetItems)
  const [resultItems, setResultItems] = useState<ResultLineItem[]>(initialResultItems)

  // Determine the currency for the event (from stripe account, ticket types, or default to EUR)
  const eventCurrency = event.stripeAccount?.defaultCurrency ||
    event.ticketTypes?.[0]?.currency ||
    "eur"

  // Navigation warning state
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false)
  const pendingNavigationRef = useRef<string | null>(null)

  const form = useEventForm(event)

  // Track dirty state
  const { isDirty, resetDirtyState } = useFormDirty(form.formValues)

  // Browser beforeunload warning
  useBeforeUnload(isDirty)

  // Intercept Link clicks to warn about unsaved changes
  useEffect(() => {
    if (!isDirty) return

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const link = target.closest("a")

      if (!link) return

      // Check if it's an internal navigation link
      const href = link.getAttribute("href")
      if (!href || href.startsWith("#") || href.startsWith("mailto:")) return

      // Check if it's an external link (opens in new tab)
      if (link.target === "_blank") return

      // Prevent navigation and show dialog
      e.preventDefault()
      e.stopPropagation()
      pendingNavigationRef.current = href
      setShowUnsavedDialog(true)
    }

    // Capture phase to intercept before Next.js router
    document.addEventListener("click", handleClick, true)
    return () => document.removeEventListener("click", handleClick, true)
  }, [isDirty])

  // Handle browser back/forward navigation
  useEffect(() => {
    if (!isDirty) return

    const handlePopState = () => {
      // Push current state back to prevent navigation
      window.history.pushState(null, "", window.location.href)
      setShowUnsavedDialog(true)
      pendingNavigationRef.current = "back"
    }

    // Push initial state
    window.history.pushState(null, "", window.location.href)
    window.addEventListener("popstate", handlePopState)

    return () => window.removeEventListener("popstate", handlePopState)
  }, [isDirty])

  const handleSaveAndNavigate = useCallback(async () => {
    setIsSubmitting(true)

    const { data, error: validationError } = form.buildSubmitData()

    if (validationError) {
      toast.error(validationError)
      setIsSubmitting(false)
      return
    }

    if (!data) {
      toast.error("Failed to build form data")
      setIsSubmitting(false)
      return
    }

    const result = await updateEvent(event.slug, data)

    if (result.success) {
      toast.success("Event updated successfully!")
      resetDirtyState()
      setShowUnsavedDialog(false)

      // Navigate after save
      const destination = pendingNavigationRef.current
      pendingNavigationRef.current = null

      if (destination === "back") {
        router.back()
      } else if (destination) {
        router.push(destination)
      }
    } else {
      toast.error(result.error || "Failed to update event")
    }

    setIsSubmitting(false)
  }, [form, event.slug, toast, resetDirtyState, router])

  const handleDiscardAndNavigate = useCallback(() => {
    resetDirtyState()
    setShowUnsavedDialog(false)

    const destination = pendingNavigationRef.current
    pendingNavigationRef.current = null

    if (destination === "back") {
      router.back()
    } else if (destination) {
      router.push(destination)
    }
  }, [resetDirtyState, router])

  const handleCancelNavigation = useCallback(() => {
    pendingNavigationRef.current = null
    setShowUnsavedDialog(false)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    const { data, error: validationError } = form.buildSubmitData()

    if (validationError) {
      toast.error(validationError)
      setIsSubmitting(false)
      return
    }

    if (!data) {
      toast.error("Failed to build form data")
      setIsSubmitting(false)
      return
    }

    const result = await updateEvent(event.slug, data)

    if (result.success) {
      toast.success("Event updated successfully!")
      resetDirtyState()
      router.refresh()
    } else {
      toast.error(result.error || "Failed to update event")
    }

    setIsSubmitting(false)
  }

  const handlePublishToggle = async () => {
    setIsPublishing(true)

    const result = isPublished
      ? await unpublishEvent(event.slug)
      : await publishEvent(event.slug)

    if (result.success) {
      setIsPublished(!isPublished)
      toast.success(isPublished ? "Event unpublished" : "Event published!")
      router.refresh()
    } else {
      toast.error(
        result.error || `Failed to ${isPublished ? "unpublish" : "publish"} event`
      )
    }

    setIsPublishing(false)
  }

  const handleUpdate = () => router.refresh()

  const handleDiscard = useCallback(() => {
    form.resetForm()
    // Pass original values as the new baseline to ensure dirty state is correctly reset
    resetDirtyState(form.originalFormValues)
  }, [form, resetDirtyState])

  const handleTabChange = useCallback(
    (tab: TabId) => {
      setActiveTab(tab)
      const params = new URLSearchParams(searchParams.toString())
      params.set("tab", tab)
      router.replace(`/admin/events/${event.slug}?${params.toString()}`, { scroll: false })
    },
    [router, searchParams, event.slug]
  )

  return (
    <form onSubmit={handleSubmit} className="admin-form">
      <EventEditTabs activeTab={activeTab} onTabChange={handleTabChange} />

      <div className="event-edit-layout">
        <div className="event-edit-content">
          {activeTab === "basics" && (
            <BasicsTab
              name={form.name}
              setName={form.setName}
              eventStatus={form.eventStatus}
              setEventStatus={form.setEventStatus}
              tagline={form.tagline}
              setTagline={form.setTagline}
              contactEmail={form.contactEmail}
              setContactEmail={form.setContactEmail}
              startDate={form.startDate}
              setStartDate={form.setStartDate}
              startTime={form.startTime}
              setStartTime={form.setStartTime}
              endDate={form.endDate}
              setEndDate={form.setEndDate}
              endTime={form.endTime}
              setEndTime={form.setEndTime}
              timezone={form.timezone}
              setTimezone={form.setTimezone}
              allTimezones={form.allTimezones}
              timezoneRegions={form.timezoneRegions}
              locationMode={form.locationMode}
              setLocationMode={form.setLocationMode}
              selectedLocationId={form.selectedLocationId}
              setSelectedLocationId={form.setSelectedLocationId}
              newLocationName={form.newLocationName}
              setNewLocationName={form.setNewLocationName}
              newLocationCountry={form.newLocationCountry}
              setNewLocationCountry={form.setNewLocationCountry}
              newLocationMapLocation={form.newLocationMapLocation}
              setNewLocationMapLocation={form.setNewLocationMapLocation}
              locations={locations}
              venueMode={form.venueMode}
              setVenueMode={form.setVenueMode}
              selectedVenueId={form.selectedVenueId}
              setSelectedVenueId={form.setSelectedVenueId}
              newVenueName={form.newVenueName}
              setNewVenueName={form.setNewVenueName}
              newVenueAddress={form.newVenueAddress}
              setNewVenueAddress={form.setNewVenueAddress}
              venues={venues}
            />
          )}

          {activeTab === "content" && (
            <ContentTab
              description={form.description}
              setDescription={form.setDescription}
              eventSlug={event.slug}
              eventName={event.name}
              defaultImage={event.defaultImage}
              galleryImages={event.images}
              schedule={form.schedule}
              onScheduleChange={form.setSchedule}
              onImageUpdate={handleUpdate}
            />
          )}

          {activeTab === "schedule" && (
            <ScheduleTicketsTab
              eventDocumentId={event.documentId}
              ticketTypes={(event.ticketTypes || []) as TicketType[]}
              discountCodes={discountCodes}
              stripeAccount={event.stripeAccount}
              hostAccounts={hostAccounts}
              playerAccount={playerStripeAccount}
              onUpdate={handleUpdate}
              ticketingMode={form.ticketingMode}
              onTicketingModeChange={form.setTicketingMode}
              registrationLink={form.registrationLink}
              onRegistrationLinkChange={form.setRegistrationLink}
              registrationWidgetCode={form.registrationWidgetCode}
              onRegistrationWidgetCodeChange={form.setRegistrationWidgetCode}
            />
          )}

          {activeTab === "team" && (
            <TeamSponsorsTab
              organizers={organizers}
              eventHosts={event.hosts}
              eventMentors={event.mentors}
              selectedHostIds={form.selectedHostIds}
              setSelectedHostIds={form.setSelectedHostIds}
              selectedMentorIds={form.selectedMentorIds}
              setSelectedMentorIds={form.setSelectedMentorIds}
              sponsorships={form.sponsorships}
              onSponsorshipsChange={form.setSponsorships}
            />
          )}

          {activeTab === "participants" && (
            <ParticipantsTab
              eventDocumentId={event.documentId}
              onUpdate={handleUpdate}
            />
          )}

          {activeTab === "media" && (
            <MediaTab
              mediaLinks={form.mediaLinks}
              onMediaLinksChange={form.setMediaLinks}
            />
          )}

          {activeTab === "budget" && (
            <BudgetTab
              eventDocumentId={event.documentId}
              budgetItems={budgetItems}
              onBudgetItemsChange={setBudgetItems}
              currency={eventCurrency}
            />
          )}

          {activeTab === "actuals" && (
            <ResultsTab
              eventDocumentId={event.documentId}
              resultItems={resultItems}
              onResultItemsChange={setResultItems}
              budgetItems={budgetItems}
              ticketRevenue={ticketRevenue}
              currency={eventCurrency}
            />
          )}

          {activeTab === "finance" && (
            <FinanceTab eventDocumentId={event.documentId} />
          )}
        </div>

        <EventEditActions
          eventSlug={event.slug}
          isPublished={isPublished}
          isSubmitting={isSubmitting}
          isPublishing={isPublishing}
          isDirty={isDirty}
          onPublishToggle={handlePublishToggle}
          onDiscard={handleDiscard}
          activeTab={activeTab}
          budgetItems={budgetItems}
          resultItems={resultItems}
          ticketRevenue={ticketRevenue}
          currency={eventCurrency}
        />
      </div>

      <UnsavedChangesDialog
        isOpen={showUnsavedDialog}
        onSave={handleSaveAndNavigate}
        onDiscard={handleDiscardAndNavigate}
        onCancel={handleCancelNavigation}
        isSaving={isSubmitting}
      />
    </form>
  )
}
