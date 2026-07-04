# AIEWF Web App

A client-side single-page app for the AI Engineer World's Fair 2026

3 purposes:

- conference schedule browsing with personal scheduling
- interactive port of swyx's "The Highest Loop" talk
- interactive HOMA protocol tutorial

## Audience

- Primary: conference attendees planning and managing their schedule across Days 2–4.
- Secondary: post-event visitors reviewing session content, sharing saved schedules, and exploring the interactive modules independently.

## Architecture constraints

- Purely client-side. No backend, no API. All schedule data is embedded in the build at compile time.
- Static hosting
- Desktop-first responsive layout; mobile is best-effort.
- Browser persistence via localStorage only; no accounts or server-side state.
- Vite + React + TypeScript + MUI (defaults only, light mode, minimalist) - also see DESIGN.md

---

## Module 1 Schedule Browser

### Goal

Let attendees browse the full multi-day conference schedule, search and filter sessions, save a personal schedule, detect conflicts, and share it via URL.

### Features

1. **Multi-day tabs**: Day 2, Day 3, Day 4. Each tab shows only that day's sessions.
2. **Time-slot grouping**: Sessions grouped by start time. Each group is collapsible; expand/collapse all toggle available. Session count displayed before the collapse control.
3. **Two-column layout**: Session list on the left, session detail panel on the right. Clicking a session shows its full description, speaker bios, type, and track.
4. **Search**: Full-text across title, description, speaker name, speaker role, and track. Results update in real time.
5. **Filters**:
   - By session type (Keynote, Session, Sponsor, Workshop).
   - By track. Leadership track hidden by default but togglable.
   - Filters compose with search (intersection).
6. **My Schedule (favorites)**:
   - Star/unstar sessions from the detail panel or session card.
   - Persisted in localStorage
   - Dedicated "My Schedule" view showing only saved sessions.
7. **Conflict detection**:
   - Overlapping saved sessions on the same day flagged with a visual warning.
   - Cross-day sessions do not conflict.
8. **Share URL**:
   - Compact bitmask-encoded query parameter (`?s=<encoded>`).
   - Recipient sees the shared selection without overwriting their own saved schedule.
9. **Tentative sessions**: Labeled visually when marked tentative in source data.

### Data

- `sessions.json`: ~500+ sessions with id, day, type, track, start/end times,
  speaker references, description.
- `speakers.json`: Speaker name, role, company, bio.
- Both files embedded at build time; no runtime fetching.

---

## Module 2 — Loopcraft (swyx "The Highest Loop" port)

### Goal

A faithful interactive port of swyx's "The Highest Loop" concept
(loopcraft.swyxio.workers.dev) adapted for the web as an embedded tab in the
AIEWF app.

### Content structure

Six sections with progressive reveal (inner-first disclosure):

1. **Intro**: Title slide with a begin button.
2. **Nested Loops**: Six concentric loops revealed one at a time (step 1..6):
   - Loop 1 — Token generation (ms, blue)
   - Loop 2 — Chat turns (s, teal)
   - Loop 3 — Agent tools (min, green)
   - Loop 4 — Goals/tasks (h, gold)
   - Loop 5 — Meta/automations (d, purple)
   - Loop 6 — Open/systems (w, red)
3. **Ladder View**: While-loop ladder showing each loop's condition and tick.
4. **Human Life**: Maps loops to human experience (pulse, talk, work, tribe,
   civilization).
5. **Stress Curves**: Stress/performance tradeoff visualization across loops.
6. **Summit**: Loop 7 (AI Engineer Summit, yearly) and Loop ∞ (AIEWF, ongoing).

### Interaction

- Click-anywhere-to-advance as the primary input.
- Keyboard navigation: ← → arrows, Space.
- Back/Next buttons as a secondary control.
- Progressive reveal: step N shows levels 1..N, never skips ahead.
- Section tabs for non-linear navigation between the six sections.

### Non-goals

- No audio, video, or animation beyond CSS transitions.
- No additional content beyond what the original deck covers.

---

## Module 3 — Homa Interactive Tutorial

### Goal

Teach conceptual appreciation of the Homa datacenter transport protocol through
an interactive simulation. A visitor should walk away understanding why TCP is a
poor fit for datacenter RPCs and what Homa does differently — not enough to
implement Homa, but enough to discuss it technically.

### Full requirements

See `requirements-homa.md` for the complete specification. Summary below.

### MVP (shipped)

Four scenes with a deterministic, step-based simulation engine:

1. **TCP vs Homa**: Side-by-side comparison; same workload, contrasting tail
   latency.
2. **Blind send + grant**: Single long RPC showing unscheduled burst then
   grant-driven remainder.
3. **Priority queues**: Tiny RPCs bypass queued packets from larger messages.
4. **Overcommitment lab**: Slider to vary overcommitment; watch
   utilization/latency tradeoff.

### Post-event additions (not required for launch)

Three additional scenes to be added after the conference:

5. Preemption lag lab
6. Incast lab
7. Failure lab (packet loss, stalled senders, loss detection)

### Visualization

- SVG rail-yard metaphor: senders as tracks, TOR as priority lanes, receiver as
  the control tower.
- Every packet carries a tooltip explaining why it moved ("higher priority,"
  "grant arrived," "waiting for scheduled permission").
- Live metrics panel: P50/P99 latency, link utilization, queue occupancy.

### Controls

- Play / pause / step / reset.
- Speed selector: 1×, 4×, 8×, 16×.
- Configurable parameters per scene: sender count, RTT bytes, priority levels,
  overcommitment degree, workload distribution, fault injection toggles.

---

## Design principles

All modules follow the same design system documented in `KERNEL/DESIGN.md`:

- Minimalist. No extraneous decoration.
- MUI defaults only — no custom colors, no custom fonts.
- Light mode.
- Progressive disclosure: collapsed by default, expand downward or rightward.
- Menus top-left or top-right; sources left, details right.
- Spinners or indicators when the user must wait.
- At least 1px border thickness so elements do not collide.
- Prefer ASCII/UTF-8 over images.

## Code architecture

MVC-style split documented in `architecture.md`:

- **Models** (`app/src/models/`): Pure data, domain helpers, simulation engines.
  No React imports, no side effects.
- **Controllers** (`app/src/controllers/`): React hooks owning state and
  deriving data for views.
- **Views** (`app/src/views/`): Top-level shells (App, Homa, Loopcraft).
- **Components** (`app/src/components/`): Reusable UI pieces, stateless where
  possible.

## Testing

- Colocated tests: `*.test.ts` for models/controllers, `*.test.tsx` for
  components/views.
- Vitest + Testing Library + jsdom.
- Run: `cd app && npm test`.

## Out of scope

- Backend services, user accounts, authentication.
- Real-time schedule updates or push notifications.
- Native mobile app.
- KERNEL/requirements-v2.md "Lessons Learned Generator" (separate project).
- Full protocol fidelity to Homa Linux kernel implementation.
- WAN behavior modeling in the Homa module.


---

TODO:

For the keynote segments, if you want to surface them in the app, you'd need to decide on a UI approach — e.g., when a user selects a keynote session, show its segments as a list of timestamped links. That would be a new
  feature rather than just switching a data source. Would you like me to plan that out?
