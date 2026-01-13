# Manual Test: Event Management

## Test ID
`TEST-EVENT-001`

## Feature
Complete event lifecycle management for organizers

## Related Commits
- `60d7eab` - feat(api,web): add event creation and editing for organizers
- `2c8e2f1` - feat(api,web): add My Events page for organizers
- `e8f39ea` - feat(api,web): add tabbed event editor with internal/external ticketing
- `a1d2a25` - feat(web,api): unify event editor save behavior with single Save Changes button
- `3cda5a6` - feat(web): add dirty tracking and unsaved changes warning to event editor
- `ab050b0` - feat(web): add discard changes button to event editor
- `d42bfbd` - feat(api,web): add event publish/unpublish and preview functionality
- `1766a83` - feat(api,web): add host and mentor management to event admin
- `bff18ef` - feat(api,web): add image management and sponsors editor to event admin
- `e58ecc9` - feat(api,web): add schedule, finance, and media links editors to event admin
- `8cbe516` - feat(web,api): unify events page with tabs and sticky sidebar
- `a08d9bf` - feat(web): replace cancelled filter with show cancelled toggle
- `450f2bf` - feat(web): group event sponsors by category with section headers

## Prerequisites
- User account with Host or Mentor role
- Access to admin panel
- Test images for event photos
- Test location and venue data

## Test Environment
- [ ] Local development
- [ ] Acceptance environment
- [ ] Production environment

---

## Test Case 1: Create New Event - Basics

### Steps
1. Login as Host/Mentor
2. Navigate to `/admin/events`
3. Click "Create Event" button
4. Navigate to `/admin/events/create`
5. Fill in basic event information:
   - Event name
   - Start date/time
   - End date/time
   - Timezone
   - Event type
   - Description
6. Click "Save Changes"

### Expected Results
- Create button visible for Hosts
- Form validates required fields
- End date auto-calculates if not set
- Timezone selector works correctly
- Event slug generated from name and month
- Event saved with "Draft" status
- Redirect to event editor
- Toast notification shown

### Test Data
```
Name: Test Event Luxembourg
Start: 2026-03-15 09:00
End: 2026-03-17 18:00
Timezone: Europe/Luxembourg
Type: Standard 3-day event
```

### Validation Tests
- Empty name - should show error
- Start date after end date - should show error
- Past dates - should show warning

---

## Test Case 2: Event Editor - Tabbed Interface

### Steps
1. Open existing event in editor
2. Navigate through all tabs:
   - Basics
   - Location
   - Team (Hosts/Mentors)
   - Schedule
   - Finance
   - Images
   - Sponsors
   - Links
   - Settings
3. Verify sticky sidebar visible
4. Test tab switching
5. Verify content persists between tabs

### Expected Results
- All tabs render correctly
- Sticky sidebar shows:
  - Event status
  - Quick actions
  - Publish/Unpublish button
  - Preview link
- Tab state preserved when switching
- No data loss between tabs
- Active tab highlighted

---

## Test Case 3: Event Location Management

### Steps
1. Open event editor
2. Navigate to Location tab
3. Click "Select Location" dropdown
4. Search for existing location
5. Or click "Create New Location"
6. If creating new:
   - Enter location name
   - Auto-fill coordinates from name
   - Verify country auto-populated
   - View map preview
7. Select venue from location
8. Or create new venue
9. Save changes

### Expected Results
- Location dropdown searchable
- Flag icons shown for countries
- Modal for location creation
- Geocoding auto-fills coordinates
- Map displays location
- Venue selection updates based on location
- Venue logo displayed if available
- Changes persist after save

### Test Data
```
Location: Luxembourg City
Country: LU (auto-filled)
Coordinates: 49.6116, 6.1319 (auto-filled)

Venue: Technoport
Address: 1 Rue de l'Innovation
Logo: venue-logo.png
```

---

## Test Case 4: Host and Mentor Management

### Steps
1. Navigate to Team tab
2. Add hosts:
   - Search for players
   - Verify avatar thumbnails shown
   - Select multiple hosts
3. Add mentors:
   - Search for players
   - Select mentors
4. Remove host/mentor
5. Verify changes reflected in event details
6. Save changes

### Expected Results
- Player search works with autocomplete
- Avatar images shown in dropdowns
- Multiple selection supported
- Remove button works
- Changes don't persist until saved
- Dirty indicator shows unsaved changes
- Host/mentor list updates correctly

### Test Data
```
Hosts:
  - John Doe (with avatar)
  - Jane Smith (with avatar)
Mentors:
  - Alice Johnson
```

---

## Test Case 5: Event Schedule Editor

### Steps
1. Navigate to Schedule tab
2. Add schedule items:
   - Date/time
   - Title
   - Description
   - Location (optional)
3. Reorder schedule items
4. Edit existing items
5. Delete items
6. View public schedule preview
7. Save changes

### Expected Results
- Schedule items sortable by datetime
- Timeline layout on public page
- Items display correctly
- Drag-and-drop reordering (if implemented)
- Delete confirmation modal
- Public schedule matches editor
- Timeline grouped by day

### Test Data
```json
[
  {
    "date": "2026-03-15",
    "time": "09:00",
    "title": "Registration & Welcome Coffee",
    "location": "Main Hall"
  },
  {
    "date": "2026-03-15",
    "time": "10:00",
    "title": "Opening Keynote",
    "description": "Welcome to #play14!"
  }
]
```

---

## Test Case 6: Event Images Management

### Steps
1. Navigate to Images tab
2. Upload default event image:
   - Select image (must be 6:5 aspect ratio)
   - Verify aspect ratio validation
   - Crop if needed
   - Save
3. Add gallery images:
   - Select multiple images
   - No aspect ratio requirement
   - Upload batch
4. Reorder images
5. Delete images
6. Verify images organized in media folder: `events/{location}/{event-slug}/`

### Expected Results
- Image uploader with drag-and-drop
- Aspect ratio validation for default image (6:5)
- Cropping tool appears if ratio incorrect
- WebP conversion applied
- File size validation
- Images stored in correct folder
- Gallery displays on public page
- Thumbnails generated

### Test Data
```
Default Image: event-cover.jpg (1200x1000px, 6:5 ratio)
Gallery: 5 images, various ratios
Max size: 5MB per image
Format: JPEG, PNG (converted to WebP)
```

### Validation Tests
- Wrong aspect ratio for default - should require crop
- File too large - should show error
- Invalid format - should show error

---

## Test Case 7: Event Sponsors Management

### Steps
1. Navigate to Sponsors tab
2. Add sponsor:
   - Select from existing sponsors
   - Or create new sponsor
   - Assign category (Platinum, Gold, Silver, etc.)
3. Upload sponsor logo
4. Add sponsor link
5. Reorder sponsors within category
6. View public page
7. Verify sponsors grouped by category with headers

### Expected Results
- Sponsor search/create works
- Logo upload with ImageManager
- Category assignment
- Sponsors grouped by category on public page
- Section headers display correctly
- Order within category preserved
- Logos display at correct size

### Test Data
```json
{
  "sponsors": [
    {
      "name": "Company A",
      "category": "Platinum",
      "logo": "company-a-logo.png",
      "url": "https://company-a.com"
    },
    {
      "name": "Company B",
      "category": "Gold",
      "logo": "company-b-logo.png"
    }
  ]
}
```

---

## Test Case 8: Media Links Editor

### Steps
1. Navigate to Links tab
2. Add media links:
   - YouTube videos
   - Photo albums (Flickr, Google Photos)
   - Articles
   - Social media posts
3. Edit link titles
4. Reorder links
5. Delete links
6. View on public event page

### Expected Results
- Link input with validation
- URL format validated
- Embed preview (for videos)
- Links display on public page
- Order preserved
- Link titles editable

---

## Test Case 9: Dirty State Tracking

### Steps
1. Open event editor
2. Make changes to any field
3. Verify dirty indicator appears
4. Attempt to navigate away
5. Verify unsaved changes warning
6. Choose to stay or discard
7. Click "Discard Changes" button
8. Verify form resets
9. Save changes
10. Verify dirty indicator clears

### Expected Results
- Dirty indicator shows when changes made
- Warning modal on navigation
- Discard button clears all changes
- First click on discard works correctly
- Save clears dirty state
- Form validation before save
- Toast notification on save

### Test Scenarios
- Edit text field
- Change dropdown selection
- Add/remove items
- Upload image
- All trigger dirty state

---

## Test Case 10: Event Preview

### Steps
1. Create/edit event in draft mode
2. Click "Preview" button
3. View event at `/admin/events/[slug]/preview`
4. Verify all details display correctly:
   - Title, dates, timezone
   - Description
   - Location and venue
   - Schedule
   - Hosts and mentors
   - Images
   - Sponsors
   - Registration/ticketing
5. Test preview in both published and draft states

### Expected Results
- Preview accessible for draft events
- All data renders correctly
- Preview URL requires authentication
- Layout matches public page
- No access for non-hosts
- Draft banner shown

---

## Test Case 11: Publish/Unpublish Event

### Steps
1. Create event in draft mode
2. Complete all required fields
3. Click "Publish" button
4. Verify published status
5. Event visible on public events page
6. Click "Unpublish" button
7. Verify draft status
8. Event not visible on public page

### Expected Results
- Publish button available when required fields filled
- Confirmation modal before publish
- Status updates immediately
- Published events appear publicly
- Unpublished events only in admin
- Toast notification on status change
- Publish/unpublish permission checked

### Validation
- Missing required fields - publish disabled
- Incomplete data - show warnings

---

## Test Case 12: My Events Page

### Steps
1. Navigate to `/admin/events`
2. View list of user's events:
   - As Host
   - As Mentor
   - As Organizer
3. Filter events:
   - All / Upcoming / Past
   - Published / Draft
   - Show cancelled toggle
4. Search events
5. Sort events
6. Click event to edit

### Expected Results
- Only user's events shown
- Tabs for event grouping work
- Filters apply correctly
- Search matches name/location
- Cancelled events toggleable
- Event cards show key info:
  - Name, date, location
  - Status badge
  - Quick actions
- Edit button navigates correctly

---

## Test Case 13: Event Status Automation

### Steps
1. Create event with end date in past
2. Wait for cron job (or trigger manually)
3. Verify status updated to "Over"
4. Create event with future dates
5. Verify status "Announced" or "Open"

### Expected Results
- Cron job runs daily at 00:00 UTC
- Events past end date → "Over"
- Future events maintain status
- Automation logs correctly
- Status visible on event cards
- Public page reflects status

### Test with Cron
```bash
# Enable cron in environment
CRON_ENABLED=true

# Check cron logs
# Event status should auto-update
```

---

## Test Case 14: Event Duplicate Prevention

### Steps
1. Create event with unique name
2. Attempt to create event with same name and month
3. Verify slug conflict handling
4. Create event with same name but different month
5. Verify successful creation

### Expected Results
- Slugs auto-generated as `{name}-{month}`
- Duplicate slugs prevented
- Different months allow same name
- Slug conflict error shown
- Manual slug override possible

### Test Data
```
Event 1: "Luxembourg 03" (March 2026)
Event 2: "Luxembourg 03" (March 2026) - should conflict
Event 3: "Luxembourg 06" (June 2026) - should succeed
```

---

## Test Case 15: Multi-column Event Form Layout

### Steps
1. Open event editor on desktop
2. Verify responsive layout:
   - 3-column header (fields | fields | preview)
   - 2-column sections (sidebar | content)
3. Resize browser window
4. Test on mobile device
5. Verify layout adapts

### Expected Results
- Desktop: multi-column layout
- Tablet: 2-column or stacked
- Mobile: single column stack
- No horizontal scroll
- Form fields remain usable
- `admin-page-wide` class applied

---

## Test Case 16: Event Cancellation

### Steps
1. Open published event
2. Navigate to Settings tab
3. Change status to "Cancelled"
4. Save changes
5. View public page
6. Verify "Cancelled" badge displayed
7. Verify registration disabled
8. Filter events with "Show cancelled" toggle

### Expected Results
- Cancelled status saveable
- Badge shows on public page
- Ticket sales disabled
- Event still searchable
- Can be filtered out with toggle
- Email notification sent (if configured)

---

## Test Case 17: Event Settings & Permissions

### Steps
1. Navigate to Settings tab
2. Configure:
   - Visibility (Public/Private)
   - Registration settings
   - Attendance claim settings
   - Email notifications
3. Save settings
4. Test as different user roles:
   - Public visitor
   - Player
   - Host
   - Mentor
5. Verify permissions enforced

### Expected Results
- Only hosts can edit event
- Mentors can view but not edit (or edit based on permissions)
- Private events not listed publicly
- Registration respects settings
- Permission bootstrap system enforces rules

---

## Test Case 18: Event Analytics & Statistics

### Steps
1. Navigate to event with attendees
2. View statistics:
   - Total registrations
   - Ticket sales (if applicable)
   - Revenue (if applicable)
   - Attendee breakdown
3. Export data (if available)

### Expected Results
- Accurate counts displayed
- Real-time updates
- Charts render correctly
- Export to CSV works
- Data matches database

---

## Test Case 19: Event Search and Filtering

### Steps
1. Navigate to public events page
2. Test search:
   - By event name
   - By location
   - By date range
3. Test filters:
   - By status (Announced, Open, Over)
   - By country
   - By year
4. Test tabs:
   - All Events
   - Upcoming
   - Past Events
   - By Year
5. Verify infinite scroll/pagination

### Expected Results
- Search returns relevant results
- Filters update results
- Tabs switch correctly
- Infinite scroll loads more
- URL reflects filters
- Results sorted by date
- Load-more pattern works

---

## Test Case 20: Event Calendar View

### Steps
1. Navigate to `/events/calendar`
2. View events in calendar format
3. Switch months
4. Click event in calendar
5. Verify link to event page

### Expected Results
- Calendar displays current month
- Events shown on correct dates
- Multi-day events span correctly
- Month navigation works
- Event details shown on click
- Responsive on mobile

---

## Performance Checks

### Metrics to Verify
- [ ] Event list page load < 2 seconds
- [ ] Event editor load < 1 second
- [ ] Save operation < 1 second
- [ ] Image upload < 5 seconds
- [ ] Search results < 500ms

---

## Security Checklist

- [ ] Only hosts can edit their events
- [ ] Draft events not publicly accessible
- [ ] Slug injection prevented
- [ ] XSS in event description prevented
- [ ] Image upload validated
- [ ] File size limits enforced
- [ ] CSRF protection on forms
- [ ] Role-based permissions enforced

---

## Browser Compatibility

Test on:
- [ ] Chrome (desktop & mobile)
- [ ] Firefox (desktop & mobile)
- [ ] Safari (desktop & mobile)
- [ ] Edge

---

## Accessibility

- [ ] Form labels correct
- [ ] Keyboard navigation works
- [ ] Screen reader compatible
- [ ] Error messages announced
- [ ] Focus management correct
- [ ] Color contrast sufficient

---

## Notes
- Event slugs auto-generated as `{name}-{month}`
- Sticky sidebar requires `admin-page-wide` class
- Images converted to WebP format
- Default image must be 6:5 aspect ratio
- Events organized in media folders by location
