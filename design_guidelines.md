# Design Guidelines: Agency Client Photo Submission App

## Architecture Decisions

### Authentication
**Required** - This is a B2B app where the advertising agency needs to identify which client is submitting photos.

**Implementation:**
- Use SSO: Apple Sign-In (iOS), Google Sign-In (cross-platform)
- Login screen must display agency branding (logo/name)
- Include "Contact Support" link on login screen for client onboarding issues
- Account screen includes:
  - Client company name (non-editable, set by agency)
  - User name and avatar (customizable)
  - Log out with confirmation
  - Delete account nested under Settings > Account > Delete with double confirmation

### Navigation
**Tab Navigation** (3 tabs):
- **Gallery** (Home): View submission history
- **Create** (Center, emphasized): Camera + overlay flow
- **Profile**: Account and settings

The core action (taking and submitting photos) is positioned in the center tab with visual emphasis.

## Screen Specifications

### 1. Login/Signup Screen
- **Purpose**: Authenticate clients to track photo submissions
- **Layout**:
  - Centered vertical stack
  - Agency logo at top (generate professional camera/photo-themed logo)
  - App title: "[Agency Name] Photo Portal"
  - SSO buttons (Apple/Google)
  - Footer: "Contact Support" link
- **Safe Area**: Top and bottom system insets + Spacing.xl

### 2. Gallery Screen (Home Tab)
- **Purpose**: View all previously submitted photos with status
- **Header**: 
  - Title: "Submissions"
  - Transparent background
  - Right button: Filter icon (filter by date, status)
- **Layout**:
  - ScrollView root
  - Grid of photo cards (2 columns)
  - Each card shows: thumbnail, overlay applied, submission date, status badge ("Pending", "Posted")
  - Empty state: "No submissions yet. Tap Create to get started!"
- **Safe Area**: Top (headerHeight + Spacing.xl), Bottom (tabBarHeight + Spacing.xl)

### 3. Create Screen (Center Tab)
**Multi-step flow presented as a stack:**

**Step 1: Camera Capture**
- **Purpose**: Take photo of customer
- **Layout**:
  - Full-screen camera view
  - Minimal UI overlay:
    - Close button (top left)
    - Flash toggle (top right)
    - Large capture button (bottom center, floating)
    - Gallery picker (bottom left, small)
- **Safe Area**: All edges use system insets only
- **Floating Button Shadow**: width: 0, height: 2, opacity: 0.10, radius: 2

**Step 2: Overlay Selection**
- **Purpose**: Choose overlay to apply
- **Header**: 
  - Title: "Choose Overlay"
  - Left: Back button
  - Right: Skip button (optional overlays)
- **Layout**:
  - Photo preview at top (1:1 aspect ratio)
  - Horizontal scrolling overlay library below
  - Each overlay shown as thumbnail with label
  - Tapping overlay shows live preview on photo
  - Bottom: "Next" button
- **Safe Area**: Top (headerHeight + Spacing.xl), Bottom (tabBarHeight + Spacing.xl)

**Step 3: Preview & Submit**
- **Purpose**: Final review before submission
- **Header**:
  - Title: "Review"
  - Left: Back button
- **Layout**:
  - Large photo preview with overlay applied
  - Optional: Add caption text field
  - Bottom: "Submit to Agency" button (primary, full-width)
- **Safe Area**: Top (headerHeight + Spacing.xl), Bottom (tabBarHeight + Spacing.xl)
- **Form**: Submit button at bottom of scrollable content

**Success Modal**:
- Native modal with checkmark animation
- "Photo submitted successfully!"
- Auto-dismiss after 2s, return to Gallery

### 4. Profile Screen
- **Purpose**: Account management and settings
- **Header**: Title: "Profile", transparent
- **Layout**:
  - ScrollView root
  - Section 1: User info (avatar, name, company)
  - Section 2: Settings (notifications, help)
  - Section 3: Account (log out, delete account)
- **Safe Area**: Top (headerHeight + Spacing.xl), Bottom (tabBarHeight + Spacing.xl)

## Design System

### Color Palette
- **Primary**: Deep blue (#2563EB) - professional, trustworthy
- **Secondary**: Vibrant orange (#F97316) - creative, action-oriented
- **Success**: Green (#10B981)
- **Background**: White (#FFFFFF)
- **Surface**: Light gray (#F9FAFB)
- **Text Primary**: Dark gray (#111827)
- **Text Secondary**: Medium gray (#6B7280)
- **Border**: Light border (#E5E7EB)

### Typography
- **Headings**: SF Pro Display (iOS) / Roboto (Android), Bold, 24-28px
- **Body**: SF Pro Text / Roboto, Regular, 16px
- **Captions**: SF Pro Text / Roboto, Medium, 14px

### Interaction Design
- All touchable elements have press feedback (scale: 0.97 or opacity: 0.7)
- Camera capture button: Scale animation on press
- Submit button: Disabled state while uploading (show loading spinner)
- Floating action button shadow: offset {width: 0, height: 2}, opacity: 0.10, radius: 2

### Assets Required
1. **Agency Logo** - Professional, camera/marketing themed (generate)
2. **Overlay Library** (generate 5-8 overlays):
   - "Sold!" text overlay
   - "Just Sold!" with confetti
   - "Another Happy Customer!"
   - Custom agency branded frame
   - Achievement badges ("Top Seller", "Customer Champion")
3. **Profile Avatars** (generate 4 professional options):
   - Business professional style
   - Minimalist geometric patterns
   - Agency brand color themed

### Visual Design
- Use Feather icons from @expo/vector-icons
- Icons: camera, image, check-circle, user, settings, log-out, x, arrow-left
- NO emojis
- Camera interface: Dark overlay with white icons for contrast
- Photo cards: Rounded corners (8px), subtle border
- Status badges: Small pills with colored background

### Accessibility
- Camera button: Large touch target (minimum 64x64)
- Color contrast ratio: Minimum 4.5:1 for text
- Form labels clearly associated with inputs
- Success/error states communicated via text, not just color