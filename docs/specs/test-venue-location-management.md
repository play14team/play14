# Manual Test: Venue & Location Management

## Test ID
`TEST-VENUE-001`

## Feature
Venue and location management with geocoding, maps, and logos

## Related Commits
- `7583561` - feat(web,api): add event location management admin panel
- `2d9077c` - feat(web): improve location selection with flags, modal creation, and map enhancements
- `e94ad16` - feat(web): auto-fill coordinates and country from location name
- `bca2d5a` - feat(web,api): add venue management admin panel
- `179b006` - feat(web,api): add venue logo management and address-level geocoding
- `de26ab9` - refactor: remove venue shortName, reorder auth SSO buttons, fix nested forms
- `9c7f357` - feat(web): add unsaved changes tracking to player, venue, and location forms

## Prerequisites
- User account with Host or Mentor role
- Access to admin panel
- Test images for venue logos
- Valid addresses for geocoding testing
- Mapbox API key configured

## Test Environment
- [ ] Local development
- [ ] Acceptance environment
- [ ] Production environment

---

## Test Case 1: Create New Location

### Steps
1. Login as Host/Mentor
2. Navigate to `/admin/locations`
3. Click "Create Location"
4. Fill in location details:
   - Name (e.g., "Luxembourg City")
   - Description
5. Auto-fill coordinates:
   - Type location name
   - Trigger geocoding
   - Verify coordinates populated
   - Verify country auto-detected
6. Or manually enter:
   - Latitude
   - Longitude
   - Country
7. Verify map preview
8. Save location

### Expected Results
- Create button visible for Hosts
- Form validates required fields
- Geocoding auto-fills coordinates
- Country auto-detected from geocoding
- Flag icon displays for country
- Map shows location marker
- Location saved successfully
- Redirect to location editor
- Toast notification shown

### Test Data
```
Name: Luxembourg City
Description: Capital of Luxembourg
Coordinates: 49.6116, 6.1319 (auto-filled)
Country: LU (auto-filled)
```

### Geocoding Test Cases
- "Paris, France" → ~48.8566, 2.3522, FR
- "London, UK" → ~51.5074, -0.1278, GB
- "Berlin, Germany" → ~52.5200, 13.4050, DE

---

## Test Case 2: Location Selection Modal

### Steps
1. In event editor, select location
2. Click location dropdown
3. Search for existing location
4. Verify flag icons shown
5. Or click "Create New" in modal
6. Fill in new location details
7. Save and auto-select new location
8. Verify selection in event form

### Expected Results
- Dropdown searchable
- Flag icons displayed
- Results filtered by search
- Modal opens for creation
- New location created inline
- Auto-selected after creation
- Event form updates
- No page reload needed

---

## Test Case 3: Edit Existing Location

### Steps
1. Navigate to `/admin/locations`
2. Select location from list
3. Navigate to `/admin/locations/[id]`
4. Edit location:
   - Update name
   - Update description
   - Adjust coordinates (map interaction)
   - Change country
5. Verify map updates
6. Save changes
7. Verify events using location show updates

### Expected Results
- Location pre-populated
- Map displays current location
- Dragging map marker updates coordinates
- Country dropdown works
- Flag icon updates
- Unsaved changes tracked
- Warning on navigation
- Related events updated

---

## Test Case 4: Location with Map - 3-Column Layout

### Steps
1. Open location editor
2. Verify layout on desktop:
   - Left: Location details form
   - Center: Additional fields
   - Right: Map preview
3. Interact with map:
   - Zoom in/out
   - Pan around
   - Click to set marker
4. Resize browser window
5. Test on tablet
6. Test on mobile

### Expected Results
- Desktop: 3-column layout
- Map responsive and interactive
- Marker draggable
- Coordinates update on marker move
- Tablet: 2-column or stacked
- Mobile: single column, map below form
- `admin-page-wide` class applied
- No layout breaks

---

## Test Case 5: Create New Venue

### Steps
1. Navigate to `/admin/venues`
2. Click "Create Venue"
3. Navigate to `/admin/venues/create`
4. Fill in venue details:
   - Name
   - Description
   - Address (street)
   - City
   - Postal code
   - Country
   - Location (parent location)
5. Trigger address-level geocoding
6. Upload venue logo
7. Add venue links (website, social)
8. Save venue

### Expected Results
- Create form accessible
- All fields editable
- Address geocoding works
- Coordinates auto-fill from full address
- Location dropdown populated
- Logo upload with cropping
- Aspect ratio flexible
- Website URL validated
- Venue saved successfully
- Redirect to venue list

### Test Data
```
Name: Technoport Luxembourg
Address: 1 Rue de l'Innovation
City: Luxembourg
Postal Code: 1855
Country: LU
Location: Luxembourg City
Website: https://technoport.lu
Logo: technoport-logo.png
```

---

## Test Case 6: Venue Logo Upload

### Steps
1. Edit venue
2. Click "Upload Logo" button
3. Select image file
4. Verify cropper appears (no fixed aspect ratio)
5. Adjust crop
6. Confirm upload
7. Verify logo displays
8. Check logo in:
   - Venue list
   - Event location details
   - Public event page

### Expected Results
- Logo upload works
- Cropper allows flexible aspect ratio
- File size validated (< 5MB)
- Supported formats: JPEG, PNG, WebP
- WebP conversion applied
- Logo stored correctly
- Displays in multiple locations
- Thumbnail generated

### Test Data
```
File: venue-logo.png (500x200px, 2:5 ratio)
Max Size: 5MB
```

---

## Test Case 7: Venue Management List

### Steps
1. Navigate to `/admin/venues`
2. View venue list
3. Search venues by name
4. Filter by location
5. Sort venues
6. Click venue to edit
7. View venue details

### Expected Results
- All venues listed
- Search works
- Filter by location dropdown
- Sort alphabetically
- Venue cards show:
  - Logo
  - Name
  - Address
  - Location
- Edit button navigates correctly
- Delete option (with confirmation)

---

## Test Case 8: Address-Level Geocoding

### Steps
1. Create/edit venue
2. Enter full address:
   - Street address
   - City
   - Postal code
   - Country
3. Trigger geocoding (on blur or button click)
4. Verify coordinates populated
5. Verify map updates
6. Test with various international addresses

### Expected Results
- Geocoding uses full address
- More precise than city-level
- Coordinates accurate to building
- Map marker precise
- Handles various address formats
- International addresses supported
- Error handling for invalid addresses

### Test Addresses
```
1. 1 Rue de l'Innovation, 1855 Luxembourg, LU
2. 10 Downing Street, London, SW1A 2AA, UK
3. 1600 Pennsylvania Avenue NW, Washington, DC 20500, US
```

---

## Test Case 9: Venue-Location Relationship

### Steps
1. Create location (e.g., "Luxembourg City")
2. Create multiple venues in that location
3. View location details
4. Verify venues listed under location
5. Edit event
6. Select location
7. Verify venue dropdown filters by location
8. Change location
9. Verify venue dropdown updates

### Expected Results
- Venues linked to locations
- Dropdown filters correctly
- Only relevant venues shown
- Changing location updates venues
- Relationship maintained
- No orphaned venues

---

## Test Case 10: Geocoding Error Handling

### Steps
1. Enter invalid location name
2. Trigger geocoding
3. Verify error message
4. Manual coordinate entry still works
5. Enter partial address
6. Verify fallback behavior

### Expected Results
- Error shown for invalid inputs
- User can manually enter coordinates
- Partial geocoding attempts
- Fallback to city-level if address fails
- Clear error messages
- Form remains usable

### Invalid Test Cases
```
- "asdfasdfasdf" (nonsense)
- "Unknown Place 123456"
- Empty string
```

---

## Test Case 11: Map Interaction and Preview

### Steps
1. Open location or venue editor
2. Test map interactions:
   - Zoom in/out (mouse wheel, buttons)
   - Pan (drag)
   - Set marker (click)
   - Drag marker
3. Verify coordinate updates
4. Test map on mobile:
   - Touch zoom (pinch)
   - Touch pan (drag)
   - Touch marker drag

### Expected Results
- All map controls work
- Zoom smooth
- Pan responsive
- Marker draggable
- Coordinates update in real-time
- Mobile gestures supported
- Map loads on all devices
- Mapbox API key valid

---

## Test Case 12: Unsaved Changes Warning

### Steps
1. Edit location or venue
2. Make changes
3. Attempt to navigate away
4. Verify warning modal
5. Choose "Stay" option
6. Verify changes preserved
7. Choose "Leave" option
8. Verify changes discarded
9. Use "Discard Changes" button
10. Verify form resets

### Expected Results
- Dirty state tracked correctly
- Warning shows on navigation
- Browser back button triggers warning
- "Stay" keeps changes
- "Leave" discards changes
- "Discard Changes" button resets form
- First click on discard works
- No data loss

---

## Test Case 13: Flag Icons for Countries

### Steps
1. Create location with country "LU"
2. Verify Luxembourg flag displayed
3. Test with various countries:
   - FR (France)
   - DE (Germany)
   - US (United States)
   - GB (United Kingdom)
   - JP (Japan)
4. Verify flags in:
   - Location form
   - Location dropdown
   - Venue form
   - Public pages

### Expected Results
- Flag icons display correctly
- All country codes supported
- Flags enhance visual identification
- Fallback for missing flags
- Consistent across application
- Flags from CDN or local assets

---

## Test Case 14: Venue in Event Display

### Steps
1. Create event with venue
2. Publish event
3. View public event page
4. Verify venue information:
   - Name
   - Logo
   - Address
   - Map with marker
   - Link to venue website
5. Test map interaction on public page

### Expected Results
- Venue details displayed prominently
- Logo visible
- Address formatted correctly
- Map shows venue location
- Map interactive
- Website link opens in new tab
- Mobile-responsive

---

## Test Case 15: Location List Page

### Steps
1. Navigate to `/admin/locations`
2. View all locations
3. Search locations
4. Click location to edit
5. View location statistics:
   - Number of venues
   - Number of events
   - Countries represented

### Expected Results
- All locations listed
- Search by name works
- Statistics accurate
- Edit navigation works
- Delete option (with confirmation)
- Confirm no orphaned events

---

## Test Case 16: Remove Venue shortName Field

### Steps
1. Verify old venue records (if any)
2. Confirm `shortName` field removed from:
   - Database schema
   - API responses
   - UI forms
3. Verify no references in code
4. Test existing venues still work

### Expected Results
- shortName field completely removed
- No UI references
- No API references
- Database migration successful
- No breaking changes
- Existing data preserved

---

## Test Case 17: Nested Form Prevention

### Steps
1. Open location selector in event form
2. Click "Create New Location" modal
3. Verify modal form not nested inside event form
4. Submit new location
5. Verify no form nesting issues
6. Repeat for venue creation

### Expected Results
- Modal form renders correctly
- No nested `<form>` tags
- Form submission works
- No HTML validation errors
- Console clean (no warnings)
- Works across browsers

---

## Test Case 18: Location/Venue Deletion

### Steps
1. Create test location/venue
2. Navigate to edit page
3. Click "Delete" button
4. Verify confirmation modal
5. Confirm deletion
6. Verify item removed
7. Test deleting location with:
   - Associated venues
   - Associated events
8. Verify appropriate constraints

### Expected Results
- Delete button available
- Confirmation required
- Soft delete or hard delete (as designed)
- Can't delete location with events
- Can't delete venue with events
- Or events updated to null
- Error messages clear

---

## Test Case 19: International Address Formats

### Steps
1. Test address geocoding for various countries:
   - US: Street, City, State, ZIP
   - UK: Street, Town, Postcode
   - DE: Straße, Stadt, PLZ
   - JP: Prefecture, City, Address
2. Verify geocoding adapts to format
3. Verify correct coordinates
4. Test Unicode characters in addresses

### Expected Results
- All address formats supported
- Geocoding accurate
- Special characters handled
- Country-specific formats recognized
- Map markers precise
- No encoding issues

---

## Test Case 20: Performance and Responsiveness

### Steps
1. Create location with coordinates
2. Measure map load time
3. Test geocoding API response time
4. Load locations list with 100+ items
5. Test search performance
6. Measure form save time

### Expected Results
- Map loads < 2 seconds
- Geocoding < 1 second
- List renders < 1 second
- Search results < 300ms
- Save operation < 500ms
- No UI freezing
- Smooth interactions

---

## Security Checklist

- [ ] Only Hosts can create/edit locations
- [ ] Only Hosts can create/edit venues
- [ ] Geocoding API key secured
- [ ] File upload size limits enforced
- [ ] XSS prevented in descriptions
- [ ] SQL injection prevented in search
- [ ] CSRF protection on forms
- [ ] Coordinates validated (lat/lon ranges)
- [ ] URLs validated (website links)

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
- [ ] Map accessible alternative
- [ ] Keyboard navigation works
- [ ] Screen reader compatible
- [ ] Focus management correct
- [ ] Error messages announced
- [ ] Color contrast sufficient

---

## Notes
- Geocoding auto-fills coordinates and country
- Address-level geocoding more precise than city-level
- Venue logos have flexible aspect ratio (unlike event images)
- shortName field removed from venues
- Nested forms prevented in modals
- Unsaved changes tracking on forms
- Maps use Mapbox GL JS
- Flag icons enhance country identification
