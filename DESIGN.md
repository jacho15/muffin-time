---
name: muffin-time
description: A cozy cosmic-night study companion for two — focus timer, calendar, tasks, stats, and lifestyle tracking.
colors:
  gold: "#F5E050"
  lunar-glow: "#FFE8A3"
  stardust: "#C4A0FF"
  nebula-deep: "#1a1040"
  cosmic-purple: "#4A1B6D"
  nova-pink: "#FF6B9D"
  comet-blue: "#5B8DEF"
  aurora-blue: "#1B3A6D"
  void: "#060B18"
  midnight: "#0B1026"
  deep-blue: "#111B3A"
  nebula: "#2B1B48"
  star-white: "#E8E8F0"
  glass: "#C8B4FF0F"
  glass-border: "#C8B4FF1F"
  panel-surface: "#0D122AA6"
typography:
  display:
    fontFamily: "Playfair Display, Georgia, serif"
    fontSize: "28px"
    fontWeight: 600
    letterSpacing: "0.01em"
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 500
    letterSpacing: "0.22em"
rounded:
  sm: "6px"
  md: "8px"
  lg: "12px"
  xl: "20px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.gold}"
    textColor: "{colors.midnight}"
    rounded: "{rounded.lg}"
    padding: "13px 24px"
  input:
    backgroundColor: "{colors.glass}"
    textColor: "{colors.star-white}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
  card:
    backgroundColor: "{colors.panel-surface}"
    textColor: "{colors.star-white}"
    rounded: "{rounded.lg}"
    padding: "16px"
  nav-item-active:
    backgroundColor: "{colors.cosmic-purple}"
    textColor: "{colors.stardust}"
    rounded: "{rounded.md}"
    size: "40px"
---

# Design System: muffin-time

## 1. Overview

**Creative North Star: "The Midnight Study"**

A warm-lit desk under a night sky. The cosmos is out the window — the star field, the drifting nebula, the occasional shooting star live in the background layer — while the desk itself stays quiet, legible, and close at hand. This is a personal tool for two people, used in the evening for long stretches, so the system optimizes for calm over stimulation: dark translucent surfaces, one warm gold voice for action and time, and lavender starlight for structure.

The system explicitly rejects the gamified habit app (no streaks, badges, confetti, or guilt mechanics), the clinical health app (the period and health surfaces are as gentle and personal as everything else), and the generic gray SaaS dashboard (the night-sky identity is never traded for corporate neutrality). Atmosphere serves focus: any decoration that competes with the task — blur over text, glow over data — loses.

**Key Characteristics:**
- Deep layered night backgrounds (Void → Midnight → Nebula gradient) with an ambient cosmic background layer
- Glass surfaces defined by 1px lavender borders, not shadows
- One serif voice (Playfair Display) reserved for page titles; Inter everywhere else
- Gold = action and time; Stardust = structure and selection; category colors only in data
- Soft, quiet components: low-contrast at rest, gentle brightening on hover, 150–250ms ease-out motion

## 2. Colors

A dark celestial palette: near-black blue-violet grounds, starlight text, and a small cast of named accents that each carry one job.

### Primary
- **Gold** (#F5E050): The single warm voice. Primary action buttons, the running timer, active/lit states that mean "this is the thing you're doing." Paired with **Lunar Glow** (#FFE8A3) as its gradient partner in the `gold-btn` treatment.

### Secondary
- **Stardust** (#C4A0FF): Structural lavender. Selection states, focus borders (`stardust/50`), section labels, active nav icons, scrollbars, heat-map highs. The color of "the interface is responding to you."
- **Cosmic Purple** (#4A1B6D): Selection fill — active nav pill at 30% opacity, selected-state washes.

### Tertiary
- **Nova Pink** (#FF6B9D): Warm-personal accent — the Lifestyle heart, period tracking, destructive-adjacent hovers (sign out, delete). In the lifestyle tabs it reads affectionate, not alarming.
- **Comet Blue** (#5B8DEF): Cool informational accent — charts, event categories, links. **Aurora Blue** (#1B3A6D) is its deep wash.

### Neutral
- **Void** (#060B18): The deepest ground — sidebar, tooltips, floating chrome.
- **Midnight** (#0B1026) and **Deep Blue** (#111B3A): Body gradient stops and panel grounds.
- **Nebula** (#2B1B48): The purple bloom in the body gradient; heat-map lows. **Nebula Deep** (#1a1040) is the indigo stop at the gradient's center.
- **Star White** (#E8E8F0): All text. Full strength for headings and primary content; `/70`–`/80` for secondary text; `/60` for tracked micro-labels and tertiary metadata; `/50` reserved for icons and disabled states, never body copy.
- **Glass** (#C8B4FF0F) / **Glass Border** (#C8B4FF1F) / **Panel Surface** (#0D122AA6): The translucent lavender surface system — control fills, card grounds, and the 1px borders that define every surface.

### Named Rules
**The Quiet Gold Rule.** Gold appears on at most one primary action and the timer per screen — roughly ≤10% of any surface. If two things glow gold, neither is primary. One decorative section-header icon motif may also carry gold (e.g. the wallet on Expenses, the gym "done" state) — it reads as ornament, not action, and doesn't count against the one-primary limit.

**The Starlight Floor Rule.** Readable copy sits at Star White `/70` or above; tracked micro-labels and tertiary metadata may sit at `/60` (still AA on Midnight). Opacity below `/60` is for icons, placeholders behind floating labels, and disabled states only — never for words someone needs to read on Midnight.

**The Category Palette Rule.** The `SUBJECT_COLORS` palette (#4F9CF7, #F57C4F, #9B59B6, #2ECC71, #E74C3C, #F5E050, #1ABC9C, #E91E63, #8BC34A, #26C6DA, #5C6BC0, #AB47BC, #FFA726, #8D6E63, #607D8B, #F06292) exists for user data — subjects, courses, chart series — and never for chrome.

## 3. Typography

**Display Font:** Playfair Display (with Georgia, serif)
**Body Font:** Inter (with system-ui, sans-serif)

**Character:** A single quiet serif signature over a workhorse sans. Playfair gives each page one moment of bookish warmth — the title — and then Inter carries every label, button, number, and paragraph without ceremony. Digits in Playfair are forced to lining figures (`lnum`) so times and dates stay full-height.

### Hierarchy
- **Display / Page Title** (600, 28px, `.page-title`): One per view. The only place the serif appears.
- **Title** (500–600, 15–16px, Inter): Card and dialog headings.
- **Body** (400, 14px, 1.5): Default UI text. Star White `/70`+ per the Starlight Floor Rule.
- **Compact / Data** (400–500, 12–13px): Table cells, chart labels, metadata. Dense is fine; ambiguous is not.
- **Panel Title** (500, 13px, sentence case, `.panel-title`): The default heading on a glass panel — Star White `/80`, quiet and unobtrusive, rendered as the section's `<h2>`. This is what labels almost every panel.
- **Label** (500, 11px, 0.22em tracking, uppercase, `.section-label`): Stardust at 75% — a *rare* deliberate kicker, not a per-panel default. Reach for it only when a single tracked marker earns its place; panel headings use Panel Title instead.

### Named Rules
**The One Serif Rule.** Playfair Display appears in page titles only. Never in buttons, labels, form controls, data, or navigation — a serif timer digit is a bug.

## 4. Elevation

Flat by default: borders, not shadows. Depth is conveyed by layering translucent surfaces over the night gradient — Glass fills with 1px Glass Border edges, plus a hairline inset top highlight (`inset 0 1px 0 rgba(255,255,255,0.03)`) on panels. Box shadows are reserved for elements that genuinely float above the page plane.

### Shadow Vocabulary
- **Floating chrome** (`box-shadow: 0 4px 12px rgba(0,0,0,0.4)`): Tooltips, the floating timer, dropdown menus — things detached from the layout.
- **Auth ambience** (`box-shadow: 0 4px 60px rgba(0,0,0,0.3)`): The auth card only; the one deliberately theatrical surface.
- **Gold glow** (`box-shadow: 0 2px 12px rgba(245,224,80,0.12)`, hover `0 4px 20px @ 0.2`): Exclusive to the primary gold button.

### Named Rules
**The Borders-Not-Shadows Rule.** If it's part of the page, a 1px Glass Border defines it. If it floats above the page (tooltip, popover, floating timer), it may cast a shadow. Nothing else does.

## 5. Components

Soft and quiet: low-contrast glass at rest, gentle brightening on hover. Controls whisper until you need them.

### Buttons
- **Shape:** Gently rounded (8px for compact/icon buttons, 12px for prominent actions)
- **Primary:** Gold gradient (135°, #F5E050 → #FFE8A3 → #F5E050) with Midnight text (#0B1026), 600 weight, 13px vertical padding; soft gold glow that deepens on hover
- **Secondary / Glass:** Glass fill + Glass Border, Star White `/70` text, `hover:bg-glass-hover` brightening
- **Icon buttons:** 40×40px, 8px radius, transparent at rest; hover brings a glass wash, an accent text color, and a subtle scale (≤1.15); active scales to 0.95
- **Focus:** `focus:border-stardust/50` or a Stardust ring — never browser-default blue

### Inputs / Fields
- **Style:** Glass fill, 1px Glass Border, 8px radius, 8px/12px padding, 14px Star White text
- **Focus:** Border shifts to Stardust at 50%; no glow, no shadow
- **Auth variant:** Borderless underline fields with floating labels that rise into 11px tracked uppercase — exclusive to the auth page

### Cards / Containers
- **Corner Style:** 12px radius (`.glass-panel`, stat cards); 20px on the auth card
- **Background:** Panel Surface (#0D122AA6) or Glass over the night gradient
- **Border:** Always 1px Glass Border; **nested cards are forbidden**
- **Shadow Strategy:** None (see Elevation)
- **Internal Padding:** 16–24px

### Segmented Controls / Tabs
- Glass track (2px padding, 12px radius) with an animated pill behind the active option; inactive labels at Star White `/70`

### Navigation
- 64px icon rail on Void `/80` with backdrop blur; 20px Lucide icons at Star White `/50`
- **Active:** Cosmic Purple `/30` pill with Stardust `/25` border, icon in Stardust
- **Hover:** Icon warms toward Stardust; Void-ground tooltip slides out with the label

### The Floating Timer (signature component)
A pill of Void `/90` with backdrop blur, Glass Border, and floating-chrome shadow, fixed top-center above all views. Gold timer digits and gold controls — the one piece of chrome that carries Gold everywhere, because it *is* the current session.

## 6. Do's and Don'ts

### Do:
- **Do** define every surface with a 1px Glass Border (#C8B4FF1F) over a translucent fill — that's the system's entire depth model.
- **Do** keep readable text at Star White `/70` minimum on Midnight grounds (the Starlight Floor Rule).
- **Do** use Stardust (#C4A0FF) for focus, selection, and active states, and Gold (#F5E050) for the single primary action per screen.
- **Do** keep motion at 150–250ms with ease-out curves (`cubic-bezier(0.23, 1, 0.32, 1)`), and give every animation a `prefers-reduced-motion` fallback.
- **Do** let the Lifestyle surfaces (period, health, budget) speak in Nova Pink warmth — personal and gentle, matching PRODUCT.md's "cozy, calm, personal."

### Don't:
- **Don't** add gamified habit-app mechanics or visuals — no streaks, badges, confetti, progress-guilt, or celebratory explosions (PRODUCT.md anti-reference).
- **Don't** style the period/health tabs like a clinical health app — no sterile medical UI, no alarming reds; #E74C3C is a task-status color, not a cycle color (PRODUCT.md anti-reference).
- **Don't** drift toward the generic gray SaaS dashboard — no flat gray cards, KPI tiles, or corporate neutrality that erases the night-sky identity (PRODUCT.md anti-reference).
- **Don't** put Playfair Display anywhere but page titles (the One Serif Rule).
- **Don't** cast shadows on in-page surfaces, nest cards, or add blur that sits over text or data.
- **Don't** use Gold on more than one action per screen, or use category `SUBJECT_COLORS` for chrome.
