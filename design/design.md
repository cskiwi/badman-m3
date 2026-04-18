---
title: Gladman Design System
version: 1.0
status: draft
audience: Angular + PrimeNG implementers
---

## Gladman Design System — "Arena"

A competitive-sport / esports-inspired visual language for the Gladman
badminton platform. The system is built to layer cleanly on top of
**PrimeNG** (theme preset: Aura) and **Tailwind v4** with
`tailwindcss-primeui`, which are already installed. Every color token is
exposed as both a PrimeNG CSS variable (`--p-*`) and a Tailwind utility
(via `tailwindcss-primeui`), so component authors can use whichever
matches their context.

The aesthetic goal: match the density and energy of an esports stat
client (FACEIT, Riot client, Valorant scoreboards) while keeping
information hierarchy legible enough for weekly league use. Think
**scoreboard, not marketing site**.

---

### 1. Principles

1. **The data is the decoration.** Numbers, ranks, and scorelines carry
   the visual weight. Do not wrap them in unnecessary chrome.
2. **Tabular everywhere.** All numeric content uses `font-variant-numeric:
   tabular-nums`, and scorelines use a monospace face so columns align
   on refresh.
3. **Diagonal energy.** A 6° skew / 12° clip-path is the system's
   signature. Use sparingly — on tier badges, "LIVE" chips, and
   section-header accents — never on body surfaces.
4. **Win = lime, loss = crimson, pending = cyan.** These three states
   appear everywhere; never repurpose them.
5. **Dark first.** The app is designed to look right at 11pm after
   interclub. Light mode exists and must be equally legible, but the
   dark palette is the canonical one.
6. **Density with air.** Cards are tight (12–16px padding), but the
   gap between cards is generous (24–32px). This keeps the scoreboard
   feel without turning into a spreadsheet.

---

### 2. Color tokens

All colors defined in `oklch()` for perceptual consistency. Hex
fallbacks only where PrimeNG requires them.

#### 2.1 Surface scale

These map directly onto PrimeNG's `--p-surface-*` slots, so existing
components (`p-card`, `p-dialog`, `p-datatable`) pick them up for free.

| Token            | Dark (default)              | Light                       | Usage                          |
| ---------------- | --------------------------- | --------------------------- | ------------------------------ |
| `--p-surface-0`  | `oklch(0.14 0.02 250)`      | `oklch(1 0 0)`              | Top-level app background       |
| `--p-surface-50` | `oklch(0.17 0.02 250)`      | `oklch(0.985 0.003 250)`    | Body background                |
| `--p-surface-100`| `oklch(0.20 0.02 250)`      | `oklch(0.97 0.005 250)`     | Raised card fill               |
| `--p-surface-200`| `oklch(0.24 0.025 250)`     | `oklch(0.93 0.008 250)`     | Card borders, dividers         |
| `--p-surface-300`| `oklch(0.30 0.025 250)`     | `oklch(0.87 0.01 250)`      | Hover state on cards           |
| `--p-surface-400`| `oklch(0.42 0.02 250)`      | `oklch(0.70 0.01 250)`      | Muted labels                   |
| `--p-surface-500`| `oklch(0.55 0.015 250)`     | `oklch(0.55 0.015 250)`     | Secondary text                 |
| `--p-surface-600`| `oklch(0.68 0.012 250)`     | `oklch(0.42 0.02 250)`      | —                              |
| `--p-surface-700`| `oklch(0.78 0.01 250)`      | `oklch(0.30 0.025 250)`     | Body text                      |
| `--p-surface-800`| `oklch(0.88 0.008 250)`     | `oklch(0.20 0.02 250)`      | Strong text                    |
| `--p-surface-900`| `oklch(0.94 0.005 250)`     | `oklch(0.14 0.02 250)`      | Headings                       |
| `--p-surface-950`| `oklch(0.98 0.003 250)`     | `oklch(0.10 0.02 250)`      | Maximum contrast               |

Surfaces are **blue-black** (hue 250) rather than neutral gray — this
small amount of chroma prevents the UI looking ashen at night and
pairs naturally with the cyan primary.

#### 2.2 Brand & semantic colors

All accents share chroma ≈ 0.18–0.22 so they feel like one family.

```css
/* Primary — cyan, used for links, active nav, primary CTAs */
--p-primary-color:       oklch(0.78 0.15 210);
--p-primary-contrast:    oklch(0.14 0.02 250);
--p-primary-hover-color: oklch(0.85 0.15 210);
--p-primary-muted:       oklch(0.78 0.15 210 / 0.12);

/* Accent — magenta, used for ranking / level indicators */
--g-accent:              oklch(0.68 0.22 340);
--g-accent-muted:        oklch(0.68 0.22 340 / 0.15);

/* Win */
--g-win:                 oklch(0.85 0.18 135);
--g-win-muted:           oklch(0.85 0.18 135 / 0.14);

/* Loss */
--g-loss:                oklch(0.65 0.22 25);
--g-loss-muted:          oklch(0.65 0.22 25 / 0.14);

/* Warning / pending */
--g-pending:             oklch(0.82 0.15 85);
--g-pending-muted:       oklch(0.82 0.15 85 / 0.14);
```

In light mode, every accent shifts **lightness down by 0.06** and
**chroma up by 0.02** to keep WCAG AA on white. The `oklch()` formula
makes this a one-line override — see `.light-theme` in the HTML
prototypes for the full block.

#### 2.3 Gradients

Two gradients exist. Do not invent more.

```css
--g-gradient-primary:  linear-gradient(135deg,
  oklch(0.78 0.15 210) 0%,
  oklch(0.68 0.22 280) 100%);

--g-gradient-rank:     linear-gradient(135deg,
  oklch(0.82 0.15 85) 0%,
  oklch(0.68 0.22 340) 55%,
  oklch(0.78 0.15 210) 100%);
```

`--g-gradient-primary` is used on the main CTA and the user's own
stat-hero. `--g-gradient-rank` is reserved for **tier badges only**
(see §6.4).

---

### 3. Typography

Three families, one scale. Stick to it.

| Family          | Role                   | Weights     | Source       |
| --------------- | ---------------------- | ----------- | ------------ |
| **Space Grotesk** | Display / stat numbers | 500, 600, 700 | Google Fonts |
| **Inter**       | UI and body            | 400, 500, 600, 700 | Google Fonts |
| **JetBrains Mono**| Scorelines, IDs, tabular data | 400, 600 | Google Fonts |

Space Grotesk's geometric, slightly squared numerals carry the
scoreboard feel; Inter does the work for everything that needs to be
quickly read; JetBrains Mono locks scores into perfect columns.

#### 3.1 Scale

All sizes in rem (base = 14px, per the existing app).

| Token        | Size / line-height     | Use                                    |
| ------------ | ---------------------- | -------------------------------------- |
| `--t-stat-xl`  | 4.5rem / 1   (Space Grotesk 600) | Hero stat number (ranking) |
| `--t-stat-lg`  | 2.5rem / 1   (Space Grotesk 600) | Card stat numbers          |
| `--t-stat-md`  | 1.75rem / 1.1 (Space Grotesk 600)| Scorelines in tables       |
| `--t-display`  | 2rem / 1.1   (Space Grotesk 700) | Page titles                |
| `--t-heading`  | 1.25rem / 1.25 (Inter 600)       | Section headers            |
| `--t-body`     | 0.9375rem / 1.5 (Inter 400)      | Body                       |
| `--t-body-sm`  | 0.8125rem / 1.45 (Inter 500)     | Labels, meta               |
| `--t-eyebrow`  | 0.6875rem / 1 (Inter 700, ls 0.12em, upper) | Section eyebrow |
| `--t-mono`     | 0.9375rem / 1.2 (JetBrains Mono 400) | Score cells          |

#### 3.2 Eyebrow label

The "eyebrow" is the system's signature label — uppercase, tracked-out,
700 weight, displayed above nearly every stat block:

```
RANKING — SINGLE    MATCHES PLAYED    WIN RATE
```

It sits in `--p-surface-400` (muted) and is always followed by a
`--t-stat-*` value. This pairing is the fundamental building block of
the interface.

---

### 4. Spacing & radii

```css
--space-1:  4px;
--space-2:  8px;
--space-3:  12px;
--space-4:  16px;
--space-5:  24px;
--space-6:  32px;
--space-7:  48px;
--space-8:  64px;

--radius-sm: 4px;   /* chips, badges */
--radius-md: 8px;   /* inputs, buttons */
--radius-lg: 12px;  /* cards */
--radius-xl: 20px;  /* hero panels */
```

Cards are `--radius-lg`. Nothing is rounder than `--radius-xl`. Pills
for tier badges are fully rounded (`9999px`) but that is the only
exception.

---

### 5. Elevation

Shadows are **minimal** in dark mode — the surface scale carries
hierarchy — and **subtle** in light mode.

```css
--shadow-card:   0 1px 0 0 var(--p-surface-200) inset,
                 0 0 0 1px var(--p-surface-200);

--shadow-raised: 0 4px 12px -4px oklch(0 0 0 / 0.4),
                 0 0 0 1px var(--p-surface-200);

--shadow-glow:   0 0 0 1px var(--p-primary-color),
                 0 0 24px -4px var(--p-primary-color);
/* --shadow-glow is for the user's own row / featured state only */
```

---

### 6. Components

The PrimeNG component library is the implementation layer; this
section specifies how each component should be themed. Where a PrimeNG
preset token covers it, we override the token. Where it doesn't, we
add a `.g-*` wrapper class.

#### 6.1 Button

Maps to `p-button`.

- **Primary** — `--p-gradient-primary` background, `--p-primary-contrast`
  text, 44px tall, 16px horizontal padding, `--radius-md`, no shadow.
  On hover: brightness +6%. On active: brightness -4%.
- **Secondary** — transparent fill, 1px `--p-surface-300` border,
  `--p-surface-800` text. Hover: border flips to `--p-primary-color`.
- **Ghost** — no border, text only, `--p-surface-600`. Used in
  toolbars and table rows.
- **Danger** — `--g-loss` fill. Only for destructive actions.

All buttons use **Inter 600, tracking 0.02em**. No all-caps except on
the `.g-button-tier` variant (see §6.4).

#### 6.2 Card — `.g-card`

```
┌─────────────────────────────────────────┐
│ EYEBROW LABEL                           │  ← --t-eyebrow, --p-surface-400
│ 2 468                                   │  ← --t-stat-lg
│ +147 this season        ▁▃▆█▅▂          │  ← delta + sparkline
└─────────────────────────────────────────┘
```

- Background: `--p-surface-100`
- Border: 1px `--p-surface-200`
- Padding: `--space-4` `--space-5`
- Radius: `--radius-lg`
- Hover (interactive only): border → `--p-surface-300`, no lift

Stat cards always contain, in order: eyebrow → value → delta/sparkline.
Do not add icons to stat cards.

#### 6.3 Match row — `.g-match`

The most repeated block on the platform. A match row is a horizontal
card with a fixed left band (league / date), a central competitor
column, and a right scoreline column.

```
┌──┬──────────────────────────────────────┬───────────────┬────────┐
│▊ │ DENDERMONDSE 1H   vs   SMASH FOR FUN │ 21  21        │ +383   │
│▊ │ Nils Ottoy (5) · V. Van Poeke (3)    │ 16  15        │  pts   │
│▊ │ Kevin Sterckx (4) · Glenn L. (6)     │               │        │
└──┴──────────────────────────────────────┴───────────────┴────────┘
```

- The left band (4px wide) carries the match outcome: `--g-win`,
  `--g-loss`, or `--p-surface-300` (pending).
- Scorelines are **JetBrains Mono**, tabular, right-aligned. The
  winner's score is `--p-surface-900`, the loser's is `--p-surface-500`.
- The "own-player" name is bolded and gets a 2px dot in
  `--p-primary-color` on its leading edge.
- Points delta (`+383 pts`) uses `--g-win` on gain, `--g-loss` on
  drop, and only renders when > 0.

#### 6.4 Tier badge — `.g-tier`

Every level indicator `(5)`, `(6)`, `(8)` etc. is rendered as a tier
badge. This is the one piece of chrome that uses the diagonal clip-path
(`clip-path: polygon(12% 0, 100% 0, 88% 100%, 0 100%)`) and the
`--g-gradient-rank` background.

- Height: 22px
- Padding: 2px 10px
- Font: Space Grotesk 700, 0.75rem
- Number only; no "Lv." prefix

#### 6.5 Team card — `.g-team`

Used on `/clubs/:slug`. Shows one team per card in a grid:

- **Header strip** with the team code (e.g. `SFF 1H`), using
  `--g-gradient-primary` on a thin top band (3px).
- **Captain row** with avatar, name, email, phone (truncated).
- **Roster row** — stacked avatars (max 5 visible + `+N` chip).
- **Stat footer** — 3 eyebrow/value pairs: Matches, Wins, Win %.

Hover lifts the card 1px and flips the top-band to 100% width (from
30% default). This creates a subtle "open match" feel.

#### 6.6 Tabs — `p-tabs`

Override the active indicator to a **2px `--p-primary-color` underline**
that sits flush to the bottom of the tab strip. No rounded pill
backgrounds; this is a scoreboard, not a Material app.

#### 6.7 Nav — top bar

Sticky, 56px tall, `--p-surface-0` background with a 1px
`--p-surface-200` bottom border. Left: logo + primary nav. Right:
search, theme toggle, user menu. Active nav item: `--p-primary-color`
text + 2px underline.

---

### 7. Iconography

**PrimeIcons** (already installed) is the only icon set. Icons are
always 16px or 20px, never decorative, and always paired with a label
or in a tooltip'd icon-button. Monochrome, inheriting color from the
parent.

Do not introduce Lucide, Font Awesome, or custom SVG icons without a
system-level review.

---

### 8. Motion

- **150ms** — hover / focus / state swaps
- **250ms** — tab switches, accordion open/close
- **400ms** — page transitions
- Easing: `cubic-bezier(0.22, 1, 0.36, 1)` (ease-out-quart) for
  enters, `cubic-bezier(0.64, 0, 0.78, 0)` for exits.

The only "fancy" motion is a 1s pulse on live-match indicators
(`animation: pulse 1.4s ease-in-out infinite`).

---

### 9. Dark / light mode

`html.dark-theme` flips the surface scale (§2.1). PrimeNG's `$darkMode`
preset is overridden via `@layer` in `styles.scss`. The user-visible
toggle lives in the top-bar user menu and persists to `localStorage`
under `gladman:theme`. Default is **dark** unless the OS preference is
explicitly light.

---

### 10. Implementation notes

- All tokens live in `apps/app/src/styles/theme.scss` (currently empty
  — this doc tells you what to put in it).
- Import Google fonts once in `index.html` with
  `display=swap&family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600`.
- PrimeNG preset overrides go through the `providePrimeNG({
  theme: { preset: Aura, options: { prefix: 'p', darkModeSelector:
  '.dark-theme', cssLayer: { name: 'primeng', order: '...' } } }})`
  call in `app.config.ts`.
- Tailwind `tailwindcss-primeui` already exposes the surface scale as
  utilities (`bg-surface-100`, `text-surface-400`, etc.) — prefer
  those over custom classes in component templates.
- Never inline `oklch()` in component styles — always go through a
  variable so theme flips work.

---

### 11. Non-goals

- This is **not** a marketing site system. Do not design landing-page
  style hero banners, testimonial rails, or pricing tables.
- No emoji in UI copy. The existing app uses emoji in place of icons
  (🏸, 🏆) — these should be replaced with PrimeIcons in the refactor.
- No auto-playing motion backgrounds, particle fields, or "gamer RGB"
  effects. The esports feel comes from information density and type
  discipline, not visual noise.
