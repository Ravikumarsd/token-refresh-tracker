# Timer Tracker

## Concept & Vision
A sleek, dark-themed timer tracker for managing refresh schedules. Add email addresses with durations, start timers, pause/resume, and get visual alerts as time runs out. Feels like a mission control dashboard for tracking when to fetch fresh tokens.

## Design Language
- **Aesthetic**: Dark command center with neon accents
- **Colors**:
  - Background: `#0a0e17`
  - Card Background: `#131a2b`
  - Primary: `#00d4ff` (cyan)
  - Warning: `#ffaa00` (amber)
  - Danger: `#ff3366` (red)
  - Success: `#00ff88` (green)
  - Text Primary: `#e4e9f2`
  - Text Secondary: `#6b7a99`
  - Border: `#1e2a42`
- **Typography**: `JetBrains Mono` for timers, `Inter` for labels

## Layout & Structure
- Single page application
- Header with title and summary stats
- Input form (email + duration: days, hours, minutes)
- Grid of timer cards
- Edit modal overlay
- Delete confirmation dialog

## Features & Interactions

### Add Timer
- Enter email address
- Set duration with days (0-365), hours (0-23), minutes (0-59)
- Click "Add Timer" → creates card in IDLE state
- Min duration: 1 minute, Max: 365 days
- Default values: 0 days, 0 hours, 30 minutes
- Validation: valid email, duration >= 1 minute

### Timer Card
- Displays email, original duration, countdown, status
- **Controls**:
  - START: Begins countdown from full duration
  - PAUSE: Freezes countdown, saves remaining time
  - RESUME: Continues from paused position
  - EDIT: Opens modal to modify email/duration
  - DELETE: Removes with confirmation
- **States**:
  - IDLE (grey): Not started, countdown shows full duration
  - ACTIVE (green/amber/red): Running, color based on remaining time
  - PAUSED (amber): Frozen, shows remaining time
  - EXPIRED (grey): Countdown reached 00:00:00:00

### Edit Modal
- Pre-filled with current email and duration
- Save / Cancel buttons
- Same validation as Add

### Delete Confirmation
- Dialog asking "Delete this timer?"
- Confirm / Cancel buttons

### Countdown Display
- Format: `DD:HH:MM:SS`
- Colors based on status:
  - IDLE: Grey text
  - ACTIVE (>1hr): Green
  - ACTIVE (10min-1hr): Amber
  - ACTIVE (<10min): Red, pulsing
  - PAUSED: Amber
  - EXPIRED: Grey

### localStorage
- Data saved as JSON array
- Each timer: `{ id, email, durationDays, durationHours, durationMinutes, durationMs, startedAt, targetTime, pausedRemaining, status }`
- Loads on page refresh
- Status updates persist (pause state, remaining time)

## Component Inventory

### Input Form
- Email input (type="email", placeholder: "user@example.com")
- Days input (number, 0-365, default: 0)
- Hours input (number, 0-23, default: 0)
- Minutes input (number, 0-59, default: 30)
- "Add Timer" button (cyan)

### Timer Card
- Email label (truncated if long)
- "Original: Xd Xh Xm" label
- Large countdown display (monospace)
- Control buttons (START/PAUSE/RESUME, EDIT, DELETE)
- Status badge (IDLE/ACTIVE/PAUSED/EXPIRED)

### Edit Modal
- Email input
- Days/Hours/Minutes inputs
- Save / Cancel buttons

### Stats Display
- Total: all timers
- Active: status === 'active'
- Expired: status === 'expired'

## Technical Approach
- Vanilla HTML/CSS/JS (single file)
- localStorage for persistence
- setInterval for countdown updates (1 second)
- CSS animations for pulse effect
- Responsive grid layout
