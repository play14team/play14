# Manual Test: Player Profiles & Management

## Test ID
`TEST-PLAYER-001`

## Feature
Player profile management, avatar uploads, position hierarchy

## Related Commits
- `ec255c8` - feat(web,api): add player profile editing with secure custom endpoint
- `95fed21` - feat(web): add admin panel with OAuth authentication
- `f1fd762` - feat(web,api): add avatar upload with image cropping and auto-resize
- `c670314` - feat(web): add Tiptap WYSIWYG editor for player bio field
- `b6ce8eb` - feat(api,web): add role-based permissions with position-based role assignment
- `45bd320` - feat(api): add hierarchical position management for players
- `e3af5e3` - feat(api,web): add player management for organizers and Stripe webhook container
- `342f502` - feat(web,api): add search bar and fix accent sorting in players list
- `af91222` - feat(web,api): unify player profile and edit forms with role sync
- `3f59b59` - feat(web,api): allow organizers to manage player avatars
- `ba44767` - feat(web,api): redesign player profile layout with sticky sidebar
- `9a7d134` - feat(api): organize player avatars in dedicated media folder
- `3c4c79e` - feat(web,api): add avatar images to host/mentor dropdowns in event editor
- `12f62f1` - feat(web): add icons for social networks in admin player form
- `e989969` - feat(player): add profile location map
- `0cd1ec5` - feat(api): sync user role when player is linked via claim or admin

## Prerequisites
- User account with Player profile
- Test images for avatar upload
- Access to admin panel (for organizers)
- Test data for profile fields

## Test Environment
- [ ] Local development
- [ ] Acceptance environment
- [ ] Production environment

---

## Test Case 1: View Own Profile

### Steps
1. Login as Player
2. Navigate to `/admin/profile`
3. View profile information:
   - Avatar
   - Name, email
   - Bio
   - Position badge
   - Social media links
   - Location with map
   - Event history
   - Statistics

### Expected Results
- Profile page loads correctly
- All data displays accurately
- Sticky sidebar visible
- Tabs work (if multiple)
- Map shows player location
- Event history listed
- Statistics calculated correctly

---

## Test Case 2: Edit Own Profile - Basic Info

### Steps
1. Navigate to `/admin/profile`
2. Click "Edit" or access edit mode
3. Update fields:
   - First name
   - Last name
   - Email (read-only if from OAuth)
   - Bio (WYSIWYG editor)
   - Company
   - Job title
4. Save changes
5. Verify updates displayed

### Expected Results
- Form pre-populated with current data
- WYSIWYG editor works for bio:
  - Bold, italic, underline
  - Lists, links
  - Headings
  - No XSS vulnerabilities
- Changes saved successfully
- Profile updates immediately
- Toast notification shown
- Role synced if player was claimed

### Test Data
```
First Name: John
Last Name: Doe
Bio: I'm a passionate agile coach with 10+ years of experience...
Company: Tech Corp
Job Title: Agile Coach
```

---

## Test Case 3: Avatar Upload & Cropping

### Steps
1. Navigate to profile edit
2. Click "Upload Avatar" or avatar placeholder
3. Select image file
4. Verify cropper appears
5. Adjust crop area:
   - Drag to reposition
   - Resize crop area
   - Maintain aspect ratio
6. Confirm crop
7. Verify upload
8. Check avatar in:
   - Profile page
   - Event host/mentor lists
   - Player directory
   - Dropdowns

### Expected Results
- Image picker opens
- Supported formats: JPEG, PNG, WebP
- Cropper enforces circular aspect
- Auto-resize to appropriate dimensions
- WebP conversion applied
- File size validated (< 5MB)
- Avatar stored in `players/` media folder
- Thumbnails generated
- Avatar visible across application
- Previous avatar replaced

### Test Data
```
File: test-avatar.jpg (2MB, 2000x2000px)
Expected: Cropped and resized to 300x300px, WebP format
```

### Validation Tests
- File too large - should show error
- Invalid format - should show error
- Non-square image - should crop correctly

---

## Test Case 4: Social Media Links

### Steps
1. Edit profile
2. Add social media links:
   - LinkedIn
   - Twitter/X
   - Facebook
   - Instagram
   - GitHub
   - Personal website
3. Verify icons display next to fields
4. Save changes
5. View public profile
6. Click social links
7. Verify correct URLs and new tab opening

### Expected Results
- Icon displayed for each platform
- URL validation works
- Optional fields can be left empty
- Links open in new tab
- Icons display on public profile
- Links formatted correctly (https://)

### Test Data
```
LinkedIn: https://linkedin.com/in/johndoe
Twitter: https://twitter.com/johndoe
GitHub: https://github.com/johndoe
Website: https://johndoe.com
```

---

## Test Case 5: Location with Map

### Steps
1. Edit profile
2. Update location:
   - City
   - Country
   - Coordinates (auto-filled or manual)
3. Save changes
4. View profile
5. Verify map displays player location
6. Test map interactions:
   - Zoom
   - Pan
   - Marker click

### Expected Results
- Location form with city/country fields
- Geocoding auto-fills coordinates
- Map preview in edit mode
- Mapbox map on public profile
- Marker shows player location
- Map responsive on mobile
- Privacy: exact address not required

### Test Data
```
City: Luxembourg City
Country: Luxembourg
Coordinates: 49.6116, 6.1319 (auto-filled)
```

---

## Test Case 6: Position Hierarchy Display

### Steps
1. View profile of players with different positions:
   - Player
   - Host
   - Mentor
   - Founder
2. Verify position badge displayed
3. Check badge styling
4. Verify position-based permissions

### Expected Results
- Position badge visible on profile
- Different colors/styles per position:
  - Player: default
  - Host: distinct color
  - Mentor: distinct color
  - Founder: distinct color
- Position reflects event history
- Auto-promotion works (tested separately)

---

## Test Case 7: Position Auto-Promotion (Cron Job)

### Steps
1. Create player with no events
2. Add player as host to an event
3. Wait for cron job (daily 00:05 UTC) or trigger manually
4. Verify promotion from Player to Host
5. Add player as mentor to an event
6. Run cron again
7. Verify promotion from Host to Mentor
8. Verify Founder position is immutable

### Expected Results
- Player → Host after hosting 1+ events
- Host → Mentor after mentoring 1+ events
- Founder position never changes
- Role synced in users table
- Position updated in database
- Cron logs activity

### Test Cron
```bash
# Enable cron
CRON_ENABLED=true

# Check logs for position updates
# Should run at 00:05 UTC daily
```

---

## Test Case 8: Role Synchronization

### Steps
1. Create player account
2. Claim player profile via admin
3. Verify user role updated
4. Promote player position (Host/Mentor)
5. Verify role synced to user account
6. Test permissions based on role

### Expected Results
- Role synced when player claimed
- Position changes sync role
- Permissions updated immediately
- Player → Authenticated role
- Host → Host role (if different)
- Mentor → Mentor role
- Founder → Founder role

---

## Test Case 9: Admin Player Management - View List

### Steps
1. Login as organizer (Host, Mentor, or Founder)
2. Navigate to `/admin/players`
3. View player list
4. Test search functionality
5. Test sorting (alphabetical with accent handling)
6. View player details

### Expected Results
- All players listed (if Founder/Mentor)
- Search works by name/email
- Accent-insensitive sorting (é = e)
- Player cards show:
  - Avatar
  - Name
  - Position badge
  - Key stats
- Click opens player detail view
- Pagination works

### Test Search
```
Search: "Cédric" should match "Cedric Pontet"
Search: "josé" should match "José Silva"
```

---

## Test Case 10: Admin Player Management - Edit Player

### Steps
1. Navigate to `/admin/players/[id]`
2. Edit player as organizer:
   - Basic info
   - Avatar (organizers can manage)
   - Position (manual override)
   - Link to user account
3. Save changes
4. Verify updates
5. Check role sync if position changed

### Expected Results
- Organizers can edit any player
- Avatar upload works same as self-edit
- Position can be manually set
- Manual position overrides auto-promotion
- User link creates authentication
- Role synced on save
- Audit log records changes (if implemented)

---

## Test Case 11: Profile Page Layout - Sticky Sidebar

### Steps
1. View player profile (public or admin)
2. Scroll down page
3. Verify sidebar behavior:
   - Avatar
   - Quick stats
   - Position badge
   - Action buttons
4. Test on different screen sizes

### Expected Results
- Sidebar sticks on scroll (desktop)
- Sidebar stacks on mobile
- Layout uses `admin-page-wide` class
- 3-column grid for forms
- Responsive breakpoints work
- No horizontal scroll

---

## Test Case 12: Player Directory - Public View

### Steps
1. Navigate to `/players`
2. Browse player list
3. Test filters:
   - By position
   - By letter (A-Z)
   - Search by name
4. Click player to view profile
5. Test pagination/infinite scroll

### Expected Results
- All published players visible
- Filtering works correctly
- Alphabetical navigation works
- Scroll-to-top button appears
- Profiles load correctly
- Private profiles excluded (if implemented)

---

## Test Case 13: Player Statistics

### Steps
1. View player profile
2. Verify statistics displayed:
   - Total events attended
   - Events hosted
   - Events mentored
   - Countries visited
   - Years active
3. Verify accuracy against event data

### Expected Results
- All stats calculated correctly
- Stats update when events change
- Historical data preserved
- Counts match database
- Display formatted nicely

---

## Test Case 14: Event History on Profile

### Steps
1. View player profile
2. Check event history section:
   - Events attended
   - Events hosted
   - Events mentored
3. Verify grouping by year
4. Click event to view details
5. Verify chronological order

### Expected Results
- All related events listed
- Events grouped logically
- Latest events first
- Event cards show:
  - Name, date, location
  - Player's role (attended/hosted/mentored)
- Links navigate correctly

---

## Test Case 15: Player Avatar in Dropdowns

### Steps
1. Navigate to event editor
2. Open host dropdown
3. Verify avatars shown in dropdown
4. Open mentor dropdown
5. Verify avatars shown
6. Select players
7. Verify selection displays with avatars

### Expected Results
- Avatar thumbnails in dropdowns
- Dropdown searchable
- Avatar improves identification
- Fallback for missing avatars
- Performance acceptable with many players

---

## Test Case 16: Player Import Workflow

### Steps
1. Login as organizer
2. Navigate to `/admin/imports`
3. View import workflow instructions
4. Upload CSV with player data
5. Review import preview
6. Confirm import
7. Verify players created
8. Check for duplicates handled

### Expected Results
- Import page accessible
- CSV format documented
- Preview shows data correctly
- Import validates data
- Duplicate detection works
- Errors reported clearly
- Successful imports confirmed
- Onboarding updates applied

### Test Data (CSV)
```csv
firstName,lastName,email,company,position
Alice,Smith,alice@example.com,Tech Corp,Player
Bob,Johnson,bob@example.com,Agile Ltd,Host
```

---

## Test Case 17: Player Onboarding Updates

### Steps
1. Access onboarding workflow
2. Review onboarding checklist
3. Complete onboarding steps:
   - Profile completion
   - Avatar upload
   - Bio writing
   - Event attendance claim
4. Verify progress tracking

### Expected Results
- Onboarding checklist visible
- Progress indicator shows completion
- Steps guide new players
- Completion status persists
- Redirect after completion

---

## Test Case 18: Profile Privacy Settings

### Steps
1. Edit profile
2. Configure privacy settings (if available):
   - Public/private profile
   - Hide email
   - Hide location
   - Hide social links
3. Save settings
4. View as different user
5. Verify privacy respected

### Expected Results
- Privacy toggles work
- Public view respects settings
- Private data not exposed in API
- Authenticated users see more (if configured)

---

## Test Case 19: Profile Form Validation

### Steps
1. Edit profile
2. Test validation:
   - Clear required fields
   - Enter invalid email format
   - Enter malformed URLs
   - Upload huge file
   - Enter XSS attempts in bio
3. Attempt to save
4. Verify validation errors

### Expected Results
- Required fields enforced
- Email format validated
- URL format validated
- File size limits enforced
- XSS prevented (HTML sanitized)
- Error messages clear
- Form highlights invalid fields

### XSS Test
```html
Bio: <script>alert('XSS')</script>
Expected: Script tags stripped or escaped
```

---

## Test Case 20: Multi-Column Form Layout

### Steps
1. Open player edit form on desktop
2. Verify 3-column layout:
   - Column 1: Basic info fields
   - Column 2: Additional fields
   - Column 3: Avatar upload
3. Test on tablet
4. Test on mobile
5. Verify responsive stacking

### Expected Results
- Desktop: 3-column grid
- Tablet: 2-column or stacked
- Mobile: Single column
- Avatar column collapses gracefully
- No layout breaks
- Form remains usable

---

## Performance Checks

### Metrics to Verify
- [ ] Profile page load < 1 second
- [ ] Avatar upload < 5 seconds
- [ ] Player list load < 2 seconds
- [ ] Search results < 300ms
- [ ] Map rendering < 1 second

---

## Security Checklist

- [ ] Only owner can edit own profile
- [ ] Organizers can edit any profile with permissions
- [ ] XSS in bio prevented
- [ ] Avatar uploads validated
- [ ] File size limits enforced
- [ ] Email privacy respected
- [ ] CSRF protection on forms
- [ ] SQL injection prevented in search
- [ ] Profile URLs don't leak data

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
- [ ] Avatar upload accessible
- [ ] WYSIWYG editor accessible
- [ ] Keyboard navigation works
- [ ] Screen reader compatible
- [ ] Focus indicators visible
- [ ] Error messages announced

---

## Notes
- Avatars stored in `players/` media folder
- Position hierarchy: Player → Host → Mentor → Founder
- Auto-promotion via cron job (00:05 UTC daily)
- Role synced when player linked to user
- WYSIWYG editor prevents XSS
- Profile layout uses `admin-page-wide` class
