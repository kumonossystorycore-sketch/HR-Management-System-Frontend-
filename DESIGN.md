---
name: SYSTORY HRMS
description: A Lao-first HR operations and employee self-service system.
colors:
  primary-teal: "#12827a"
  deep-teal: "#086b67"
  brand-burgundy: "#8b2027"
  background: "#f3f7f6"
  surface: "#ffffff"
  text-primary: "#202b2a"
  text-secondary: "#64716f"
  border: "#dce7e4"
  control-border: "#7d8d8a"
  teal-soft: "#e3f2f0"
  success: "#16a34a"
  warning: "#f59e0b"
  danger: "#dc2626"
  info: "#0284c7"
typography:
  display:
    fontFamily: '"Noto Sans Lao", "Noto Sans", system-ui, sans-serif'
    fontSize: "32px"
    fontWeight: 700
    lineHeight: "48px"
  headline:
    fontFamily: '"Noto Sans Lao", "Noto Sans", system-ui, sans-serif'
    fontSize: "24px"
    fontWeight: 600
    lineHeight: "38px"
  title:
    fontFamily: '"Noto Sans Lao", "Noto Sans", system-ui, sans-serif'
    fontSize: "20px"
    fontWeight: 600
    lineHeight: "32px"
  body:
    fontFamily: '"Noto Sans Lao", "Noto Sans", system-ui, sans-serif'
    fontSize: "15px"
    fontWeight: 400
    lineHeight: "26px"
  label:
    fontFamily: '"Noto Sans Lao", "Noto Sans", system-ui, sans-serif'
    fontSize: "13px"
    fontWeight: 500
    lineHeight: "22px"
rounded:
  sm: "6px"
  md: "10px"
  lg: "16px"
  pill: "9999px"
spacing:
  sidebar: "264px"
  header: "64px"
  control-sm: "32px"
  control-md: "40px"
  control-lg: "48px"
  content-max: "1440px"
components:
  button-primary:
    backgroundColor: "{colors.primary-teal}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "{spacing.control-md}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "{spacing.control-md}"
  button-danger:
    backgroundColor: "{colors.danger}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "{spacing.control-md}"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.md}"
    padding: "0 12px"
    height: "{spacing.control-md}"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.lg}"
    padding: "24px"
  status-badge:
    backgroundColor: "{colors.teal-soft}"
    textColor: "{colors.deep-teal}"
    rounded: "{rounded.pill}"
    padding: "0 10px"
    height: "26px"
---

# Design System: SYSTORY HRMS

## Overview

**Creative North Star: "The SYSTORY People Desk"**

SYSTORY HRMS presents everyday people operations as clear, dependable work: administrators can scan and act on structured records, while employees can complete common self-service tasks without losing the human context. The visual system is professional and practical, with a friendly tone carried by readable Lao-first typography, clear status language, and consistent interaction states.

Keep the interface minimal and trustworthy. Use decoration only when it clarifies hierarchy or state; preserve the existing palette, component behavior, and responsive patterns rather than introducing a new visual direction.

**Key Characteristics:**
- Professional, clear, friendly, and trustworthy.
- Practical information hierarchy for frequent HR workflows.
- Lao-first typography and localization, with English supported.
- Restrained surfaces, consistent controls, and status that is never communicated by color alone.

## Colors

The palette is led by SYSTORY Teal, grounded by cool near-white surfaces, and supported by a restrained burgundy brand accent.

### Primary
- **SYSTORY Teal** (`primary-teal`): Primary actions and the principal brand accent.
- **Deep SYSTORY Teal** (`deep-teal`): Navigation, active text, links, and focus treatment where stronger contrast is needed.

### Secondary
- **SYSTORY Burgundy** (`brand-burgundy`): A supporting brand accent; keep it subordinate to teal in operational screens.
- **Soft Teal** (`teal-soft`): Hovered navigation, secondary emphasis, and quiet selected surfaces.

### Neutral
- **Cool Mist** (`background`): The application canvas.
- **White Surface** (`surface`): Cards, dialogs, popovers, and form controls.
- **Ink** (`text-primary`): Primary copy and headings.
- **Muted Ink** (`text-secondary`): Supporting copy, hints, and secondary labels.
- **Hairline** (`border`): Decorative separators and quiet container edges.
- **Control Edge** (`control-border`): Input outlines and other interactive boundaries.

Success, warning, danger, and information colors each pair a tinted surface with readable foreground text. Status badges also carry a dot and a word. Charts use a separate six-series palette; retain their legend and table alternative so interpretation does not depend on hue alone.

## Typography

**Display Font:** Noto Sans Lao (with Noto Sans, system UI, and sans-serif fallbacks)
**Body Font:** Noto Sans Lao (with Noto Sans and system UI fallbacks)
**Label/Mono Font:** No distinct label or monospaced family is established.

**Character:** Self-hosted Noto Sans Lao keeps Lao text consistent across machines. The single sans-serif family gives operational screens a clear, quiet voice; generous leading protects Lao marks and dense multilingual labels.

### Hierarchy
- **Display** (700, 32px, 48px line-height): Dashboard totals and the largest in-app emphasis.
- **Headline** (600, 24px, 38px line-height): Page titles and primary form headings.
- **Title** (600, 20px, 32px line-height): Section and dialog headings.
- **Body** (400, 15px, 26px line-height): Default reading and form text.
- **Body Small** (400, 14px, 24px line-height): Dense supporting information and table-adjacent copy.
- **Label** (500, 13px, 22px line-height): Form labels, navigation section labels, and compact controls.
- **Caption** (400, 12px, 20px line-height): Metadata and low-emphasis supporting text.

**The Lao Leading Rule.** Keep Lao text at the implemented leading or roomier; do not compress line-height to fit a layout.

## Layout

The signed-in application uses a fixed left navigation rail on viewports at or above 1024px, a 64px header, and a centered content region capped at 1440px. Below the desktop breakpoint, navigation moves into a drawer; content uses 16px horizontal padding, increasing to 32px on desktop. The sidebar is 264px wide. Keep content readable and scan-friendly rather than stretching data tables edge to edge.

On narrow screens, data tables switch to card-like rows and navigation remains available through the drawer. Preserve the app shell's skip-to-content link, focus order, and print mode, which removes navigation and controls from printed reports.

## Elevation & Depth

Depth is layered and restrained. Hairline borders define cards and popovers; shadows clarify elevation and separation rather than decorate every element. Dialogs and drawers use stronger elevation against their backdrop and do not require a border in every case.

### Shadow Vocabulary
- **Quiet surface** (`0 1px 2px rgba(32, 43, 42, 0.06)`): Resting cards and low-elevation content.
- **Raised interaction** (`0 6px 16px rgba(8, 107, 103, 0.10)`): Elevated menus and focused overlays when needed.
- **Modal separation** (`0 20px 48px rgba(32, 43, 42, 0.20)`): High-elevation dialogs and blocking layers.

**The Bordered Content Surface Rule.** Pair card and popover shadows with a visible border; use overlay contrast and elevation to separate dialogs and drawers.

## Shapes

Controls use gently rounded corners (10px); cards and dialogs are more generously rounded (16px). Status badges and active navigation links use a pill silhouette. Borders are thin and functional: stronger on controls, quieter on decorative separators. Avoid adding extra nested surface frames.

## Components

### Buttons
- **Shape:** Compact rounded corners (10px), consistent across variants.
- **Primary:** Teal fill, white text, medium control height (40px), and 16px horizontal padding.
- **Secondary:** White surface with a visible control border; hover deepens the edge and subtly changes the canvas.
- **Ghost / Link:** Transparent or text-only actions use deep teal; links remain underlined.
- **Danger:** Red fill for destructive actions; disabled buttons use muted treatment.
- **Hover / Focus:** 150ms color transition; use the shared 2px visible focus outline. Pressed buttons shift down by 1px.

### Chips
- **Style:** Status badges use a tinted semantic surface, readable foreground, a 6px dot, and a short label.
- **State:** Success, warning, danger, information, teal, and neutral tones. Never encode status by color alone.

### Cards / Containers
- **Corner Style:** Rounded corners (16px).
- **Background:** White surface against the Cool Mist canvas.
- **Shadow Strategy:** A quiet shadow paired with a hairline border.
- **Internal Padding:** 24px by default; card headers separate title/description from actions.

### Inputs / Fields
- **Style:** White surface, 40px height, 10px corners, 12px horizontal padding, and a strong control edge.
- **Focus:** Deep teal border with a visible 2px focus outline.
- **Error / Disabled:** Destructive outline for invalid fields; disabled fields use the canvas and muted text.
- **Selects:** Native select behavior is retained for keyboard, screen-reader, and mobile picker support.

### Navigation
- **Desktop:** Fixed deep-teal rail, 264px wide, grouped by workflow area; the logo sits on a white plate.
- **Active:** White pill with deep-teal text; inactive links use pale text and a quiet translucent hover.
- **Mobile:** The same permission-filtered navigation moves into a drawer.
- **User context:** Signed-in name and role stay visible in the rail; sign-out is an icon action with an accessible label.

### Status Badge
- Status combines a semantic color, a small dot, and a localized word. Keep the text present in every tone.

## Do's and Don'ts

### Do:
- **Do** preserve SYSTORY Teal, Cool Mist, the existing type family, and the established component shapes.
- **Do** keep color roles semantic and status labels explicit in both supported languages.
- **Do** retain visible keyboard focus and the reduced-motion behavior already provided.
- **Do** keep operational pages structured, readable, and efficient for repeated daily use.
- **Do** preserve the mobile drawer, card-based table adaptation, and print-specific report behavior.

### Don't:
- **Don't** introduce a new visual identity, inconsistent colors, excessive decoration, or unnecessary animation.
- **Don't** communicate a status with color alone.
- **Don't** compress Lao line-height or clip tone marks to save space.
- **Don't** use shadows without the established border treatment or add nested card frames.
- **Don't** imply legal compliance, customer proof, or product outcomes that have not been established.