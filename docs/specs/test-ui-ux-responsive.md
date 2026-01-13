# Manual Test: UI/UX & Responsive Design

## Test ID
`TEST-UI-001`

## Feature
User interface, user experience, theme support, and responsive design

## Related Commits
- `d399346` - feat(web): add theme toggle to admin panel sidebar
- `06396aa` - feat(web): add toggle switch UI and semantic color variables
- `9d30eeb` - feat(web): unify image upload UI with visual hierarchy buttons
- `80ef794` - fix(web): improve visibility of selection and remove buttons in admin panel
- `c5acd50` - feat(web): add toast notification system for admin panel
- `0d9e5a5` - feat(web): replace native confirm dialogs with custom modal component
- `3ad2949` - refactor(web): redesign event schedule with timeline layout
- `a33c311` - feat(web): improve ticket selector for draft events and dark mode
- `1ba1934` - style(web): improve admin panel contrast with dedicated surface colors
- `79156f0` - style(web): optimize event basics tab with 3-column and 2-column layouts
- `48e4374` - style(web): redesign location edit form with 3-column responsive layout
- `9a3d0d3` - style(web): redesign venue edit form with 3-column responsive layout
- `51bf81b` - refactor(web): improve admin UI layout and navigation
- `10f2d18` - fix(web): replace deprecated Sass lighten/darken with color.adjust

## Prerequisites
- Access to application (public and admin areas)
- Multiple devices or browser dev tools
- Various screen sizes to test
- Both light and dark mode support

## Test Environment
- [ ] Local development
- [ ] Acceptance environment
- [ ] Production environment

---

## Test Case 1: Light/Dark Theme Toggle

### Steps
1. Navigate to admin panel
2. Locate theme toggle in sidebar
3. Switch from light to dark mode
4. Verify all UI elements adapt:
   - Background colors
   - Text colors
   - Form inputs
   - Buttons
   - Cards
   - Navigation
5. Switch back to light mode
6. Verify theme persists across:
   - Page refreshes
   - Navigation
   - Browser sessions

### Expected Results
- Toggle visible and accessible
- Smooth theme transition
- All colors readable in both modes
- Sufficient contrast in dark mode
- Theme preference saved (localStorage/cookie)
- No FOUC (Flash of Unstyled Content)
- Icons adapt to theme
- Images/logos visible in both modes

### Visual Checks
- [ ] Admin sidebar
- [ ] Forms and inputs
- [ ] Event cards
- [ ] Player profiles
- [ ] Modal dialogs
- [ ] Toast notifications
- [ ] Tables/lists
- [ ] Ticket selector

---

## Test Case 2: Toast Notification System

### Steps
1. Trigger various actions:
   - Save form
   - Delete item
   - Upload image
   - Submit payment
   - Error scenario
2. Observe toast notifications
3. Verify toast features:
   - Auto-dismiss after timeout
   - Manual dismiss with close button
   - Multiple toasts stacking
   - Different types (success, error, warning, info)
4. Test on mobile

### Expected Results
- Toasts appear in consistent location
- Readable text and icons
- Auto-dismiss after 3-5 seconds
- Close button works
- Multiple toasts don't overlap
- Toast types visually distinct:
  - Success: green
  - Error: red
  - Warning: yellow/orange
  - Info: blue
- Animations smooth
- Mobile-responsive positioning
- Accessible (screen reader announcements)

### Test Scenarios
```
Success: "Event saved successfully"
Error: "Failed to upload image"
Warning: "Session expiring soon"
Info: "New feature available"
```

---

## Test Case 3: Custom Modal Dialogs

### Steps
1. Trigger modal dialogs:
   - Confirm delete
   - Unsaved changes warning
   - Image crop tool
   - Location creation
   - Payment confirmation
2. Test modal interactions:
   - Click backdrop to close
   - Press ESC to close
   - Click X button
   - Confirm/Cancel buttons
3. Verify modal behavior:
   - Scrolling disabled on body
   - Focus trapped in modal
   - Keyboard navigation works
   - Mobile responsive

### Expected Results
- Native confirm() replaced with custom modal
- Modal centered on screen
- Backdrop overlay visible
- Close on ESC key
- Close on backdrop click
- Buttons clearly labeled
- Primary action highlighted
- Body scroll locked
- Focus returns after close
- Animation smooth
- Mobile: full screen or adaptive
- Accessible (ARIA attributes)

### Modal Types to Test
- [ ] Confirmation (Yes/No)
- [ ] Alert (OK only)
- [ ] Form modal (Create location)
- [ ] Image modal (Cropper)
- [ ] Info modal (Help text)

---

## Test Case 4: Toggle Switch Component

### Steps
1. Locate toggle switches:
   - Feature flags
   - Payment enabled/disabled
   - Show cancelled events
   - Privacy settings
2. Test toggle interaction:
   - Click to toggle
   - Keyboard (Space/Enter)
   - Touch on mobile
3. Verify state persistence
4. Test in light and dark mode

### Expected Results
- Toggle switches use semantic colors
- Clear on/off states
- Smooth animation
- Haptic feedback on mobile (if supported)
- State persists
- Label associated correctly
- Accessible (ARIA role="switch")
- Visual distinction from checkboxes

### Semantic Colors
- Off: Gray/neutral
- On: Brand color (blue/green)
- Disabled: Faded gray

---

## Test Case 5: Image Upload UI

### Steps
1. Test image upload in various contexts:
   - Event images
   - Venue logos
   - Player avatars
   - Sponsor logos
2. Verify unified upload interface:
   - Drag-and-drop zone
   - Click to browse
   - Progress indicator
   - Preview thumbnail
   - Edit/delete buttons
3. Test visual hierarchy of buttons:
   - Primary action (Upload)
   - Secondary action (Replace)
   - Destructive action (Delete)

### Expected Results
- Consistent upload UI everywhere
- Drag-and-drop works
- Progress bar during upload
- Preview shows immediately
- Buttons follow hierarchy:
  - Primary: Solid color, prominent
  - Secondary: Outline, less prominent
  - Destructive: Red, clearly dangerous
- Hover states clear
- Mobile-friendly (no drag-and-drop, use file picker)
- Error messages clear

---

## Test Case 6: Admin Panel Contrast & Surface Colors

### Steps
1. Navigate admin panel in light mode
2. Check surface color hierarchy:
   - Page background
   - Card backgrounds
   - Input backgrounds
   - Elevated surfaces (modals, dropdowns)
3. Switch to dark mode
4. Verify contrast ratios:
   - Text on backgrounds
   - Borders visibility
   - Focus indicators
5. Test with vision accessibility tools

### Expected Results
- Dedicated surface colors defined
- Clear visual hierarchy
- Sufficient contrast (WCAG AA):
  - Normal text: 4.5:1
  - Large text: 3:1
  - UI components: 3:1
- Dark mode not just inverted
- Optimized color palette for each mode
- No pure black (#000) in dark mode
- Selection/remove buttons visible

---

## Test Case 7: Responsive Layout - Desktop

### Steps
1. Open application on desktop (1920x1080)
2. Test admin layouts:
   - Event editor (3-column + sidebar)
   - Player form (3-column header)
   - Location form (2-column + map)
   - Venue form (2-column + map)
3. Resize window from 1920px to 1024px
4. Verify breakpoints trigger layout changes

### Expected Results
- Multi-column layouts on wide screens
- Optimal use of space
- No excessive white space
- Text line lengths readable
- Forms easy to scan
- Sticky sidebars work
- `admin-page-wide` utilized correctly

### Breakpoints to Test
- 1920px: Full 3-column
- 1440px: Full 3-column
- 1024px: 2-column or adapted 3-column
- 768px: Stacked columns

---

## Test Case 8: Responsive Layout - Tablet

### Steps
1. Test on tablet (768px wide, e.g., iPad)
2. Test in portrait and landscape
3. Check layouts:
   - Event list/grid
   - Event editor
   - Player profiles
   - Forms
   - Navigation
4. Test touch interactions:
   - Tap buttons
   - Swipe carousels
   - Pinch zoom (maps)
   - Scroll

### Expected Results
- Portrait: single or 2-column
- Landscape: 2 or 3-column
- Touch targets ≥ 44x44px
- No hover-only interactions
- Menus accessible
- Forms usable
- Maps touch-friendly
- No horizontal scroll

---

## Test Case 9: Responsive Layout - Mobile

### Steps
1. Test on mobile (375px wide, e.g., iPhone)
2. Test all pages:
   - Home
   - Events list
   - Event detail
   - Player list
   - Admin panel
   - Forms
3. Test navigation:
   - Hamburger menu
   - Tab bars
   - Breadcrumbs
4. Test interactions:
   - Form inputs
   - Buttons
   - Modals
   - Dropdowns

### Expected Results
- Single column layout
- Full-width content
- Large touch targets
- Readable font sizes (min 16px)
- Forms easy to fill
- Navigation accessible
- Modals full-screen or bottom sheet
- No desktop-only features
- Minimal horizontal scrolling
- Performance optimized

---

## Test Case 10: Event Schedule Timeline Layout

### Steps
1. Navigate to event page with schedule
2. View schedule in timeline format
3. Verify timeline features:
   - Chronological order
   - Day groupings
   - Time indicators
   - Event titles
   - Descriptions
   - Locations
4. Test on mobile

### Expected Results
- Timeline visually clear
- Days separated
- Time on left, content on right
- Lines connect timeline
- Responsive stacking on mobile
- Readable at all sizes
- Print-friendly (if applicable)

---

## Test Case 11: Ticket Selector - Dark Mode

### Steps
1. Navigate to event with tickets
2. Switch to dark mode
3. View ticket selector
4. Interact with selector:
   - Quantity buttons
   - Discount code input
   - Total calculation
   - Checkout button
5. Verify readability and usability

### Expected Results
- All text readable
- Buttons visible and clickable
- Input fields distinguishable
- Price displays clearly
- Hover/active states visible
- No color contrast issues
- Draft event indicators visible

---

## Test Case 12: Form Layouts - 3-Column & 2-Column

### Steps
1. Open various forms:
   - Event Basics (3-column + 2-column sections)
   - Location Edit (3-column)
   - Venue Edit (3-column)
   - Player Edit (3-column header)
2. Verify column layouts
3. Test field widths and groupings
4. Resize window to test breakpoints

### Expected Results
- Columns evenly distributed
- Related fields grouped
- Logical tab order
- Labels aligned
- Help text visible
- Responsive breakpoints smooth
- Mobile: single column
- Tablet: 2-column
- Desktop: 3-column

---

## Test Case 13: Navigation and Sidebar

### Steps
1. Navigate admin panel
2. Test sidebar navigation:
   - Menu items
   - Active states
   - Collapsible sections
   - Icons
3. Test main navigation (public site):
   - Header
   - Footer
   - Breadcrumbs
4. Test sticky behavior

### Expected Results
- Navigation intuitive
- Active page highlighted
- Hover states clear
- Icons meaningful
- Responsive menu (hamburger on mobile)
- Sidebar collapsible
- Sticky positioning works
- No z-index issues

---

## Test Case 14: Button Visual Hierarchy

### Steps
1. Review buttons across application
2. Identify button types:
   - Primary actions (Save, Submit)
   - Secondary actions (Cancel, Back)
   - Destructive actions (Delete, Remove)
   - Tertiary actions (Edit, View)
3. Verify consistent styling
4. Test disabled states

### Expected Results
- Clear hierarchy:
  - Primary: Solid, brand color
  - Secondary: Outline or ghost
  - Destructive: Red/danger color
  - Tertiary: Text link or subtle
- Hover/active states
- Focus indicators
- Disabled styling (faded, cursor not-allowed)
- Loading states (spinners)
- Icon + text combinations

---

## Test Case 15: Form Inputs and Controls

### Steps
1. Test all form input types:
   - Text inputs
   - Text areas
   - Dropdowns/selects
   - Date pickers
   - Time pickers
   - Checkboxes
   - Radio buttons
   - Toggle switches
   - File uploads
   - WYSIWYG editor
2. Verify styling consistency
3. Test validation states

### Expected Results
- Consistent styling
- Clear focus states
- Validation messages positioned well
- Error states highlighted (red border)
- Success states (green check)
- Labels always visible
- Placeholder text appropriate
- Help text available
- Accessible (labels, ARIA)

---

## Test Case 16: Cards and Lists

### Steps
1. View content in cards:
   - Event cards (grid/list)
   - Player cards
   - Venue cards
   - Order cards
2. View content in lists:
   - Admin tables
   - Event schedules
   - Transaction lists
3. Test hover states
4. Test selection states

### Expected Results
- Cards have consistent styling
- Shadow/border for elevation
- Hover effect (lift or highlight)
- Click target clear
- Information hierarchy clear
- Responsive grid (1-4 columns)
- Lists readable
- Alternating rows (if applicable)
- Sorting indicators

---

## Test Case 17: Loading States and Skeletons

### Steps
1. Navigate to pages with loading data
2. Observe loading indicators:
   - Skeleton screens
   - Spinners
   - Progress bars
3. Verify loading states don't cause layout shift

### Expected Results
- Loading states shown immediately
- Skeleton matches final content
- Spinners centered
- No layout shift when content loads
- Timeout handling (if load fails)
- Retry option for errors

---

## Test Case 18: Empty States

### Steps
1. View pages with no data:
   - No events
   - No players
   - No tickets sold
   - No orders
   - Search with no results
2. Verify empty state messaging
3. Check for actionable CTAs

### Expected Results
- Friendly empty state message
- Helpful illustration/icon
- Clear CTA (e.g., "Create Event")
- Not just blank page
- Consistent styling
- Encourages action

---

## Test Case 19: Accessibility - Keyboard Navigation

### Steps
1. Navigate application using only keyboard
2. Test Tab order
3. Test focus indicators
4. Test form interactions
5. Test modal navigation
6. Test menu navigation

### Expected Results
- Logical tab order
- Clear focus indicators
- Skip links available
- All interactive elements accessible
- Modals trap focus
- ESC closes modals/dropdowns
- Enter/Space activate buttons
- Arrow keys in lists/menus

---

## Test Case 20: Print Styles

### Steps
1. Navigate to event page
2. Open print preview (Ctrl+P)
3. Verify print layout
4. Test ticket/order pages
5. Test player profiles

### Expected Results
- Print stylesheet applied
- Navigation hidden
- Content optimized for paper
- Page breaks appropriate
- Colors print-friendly
- QR codes visible (if applicable)
- Footer information included

---

## Performance Checks

### Metrics to Verify
- [ ] First Contentful Paint < 1.5s
- [ ] Largest Contentful Paint < 2.5s
- [ ] Time to Interactive < 3.5s
- [ ] Cumulative Layout Shift < 0.1
- [ ] No jank on scroll
- [ ] Smooth animations (60fps)

---

## Browser Compatibility

Test on:
- [ ] Chrome (desktop & mobile)
- [ ] Firefox (desktop & mobile)
- [ ] Safari (desktop & mobile)
- [ ] Edge (desktop)
- [ ] Samsung Internet (mobile)

---

## Accessibility Checklist (WCAG 2.1 Level AA)

- [ ] Color contrast ≥ 4.5:1 (normal text)
- [ ] Color contrast ≥ 3:1 (large text, UI)
- [ ] Keyboard accessible
- [ ] Focus indicators visible
- [ ] Screen reader compatible
- [ ] Alt text for images
- [ ] Semantic HTML
- [ ] ARIA attributes correct
- [ ] Form labels associated
- [ ] Error identification clear
- [ ] Heading hierarchy logical
- [ ] Link purpose clear
- [ ] No keyboard traps

---

## Visual Regression Testing

### Areas to Screenshot
- [ ] Home page (light & dark)
- [ ] Event list (light & dark)
- [ ] Event detail (light & dark)
- [ ] Admin dashboard (light & dark)
- [ ] Player profile (light & dark)
- [ ] Forms (light & dark)
- [ ] Modals (light & dark)

---

## Notes
- Theme toggle persists preference
- Toast notifications use semantic colors
- Custom modals replace native confirm()
- Toggle switches have clear on/off states
- Image upload UI unified across application
- Admin panel uses dedicated surface colors
- Responsive breakpoints: 768px, 1024px, 1440px
- Multi-column layouts require `admin-page-wide` class
- SCSS uses modern `@use` syntax (not `@import`)
- Deprecated Sass functions (lighten/darken) replaced with color.adjust
