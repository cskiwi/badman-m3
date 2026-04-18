---
title: Arena Design System — Upgrade Plan
version: 1.0
status: active
---

## Arena Design System — Upgrade Plan

Step-by-step implementation plan for migrating the Gladman app from its current PrimeNG Aura defaults to the "Arena" design system defined in `design.md` and the two HTML prototypes (Player Page, Club Page).

### Guiding Principles

- **PrimeNG tokens first.** All color work goes through `theme.preset.ts` using `definePreset(Aura, {...})`. The preset handles dark/light mode — we never use Tailwind `dark:` classes.
- **Minimal Tailwind.** Use 1–3 utility classes per element. Close enough with 2 classes beats pixel-perfect with 20.
- **Tailwind for layout, CSS for decoration.** All layout (flex, gap, padding, position, sizing) goes in Tailwind classes on the template. SCSS is reserved only for things Tailwind can't do: clip-paths, pseudo-elements (`::after`/`::before`), backdrop-filter with `color-mix()`, gradient backgrounds using CSS variables, and complex hover states with border-color transitions. Never duplicate in SCSS what Tailwind already handles.
- **Reusable components.** Every distinct visual block becomes its own component with its own data loading (no parent mega-fetch).
- **No `assets/theme.css`.** The design prototype CSS is reference only. The app uses PrimeNG preset tokens + a small `theme.scss` for custom properties (`--g-*` tokens) that PrimeNG doesn't cover.

---

### Phase 0 — Foundation: Theme Preset & Global Tokens ✅ COMPLETE

> Goal: All PrimeNG components automatically adopt the Arena color palette, typography, and radii in both dark and light mode. No component changes yet.
>
> **Status: All 6 sub-tasks implemented and build verified.**

#### 0.1 — Configure `theme.preset.ts` with Arena surface & semantic colors ✅

Expand `BadmanPreset` in `apps/app/config/theme.preset.ts` to override Aura's color tokens:

- **Surface scale** (§2.1): Map all 12 surface slots (`surface.0` through `surface.950`) using the Arena oklch values.
- **Primary** (§2.2): Set `primary` color family (color, contrastColor, hoverColor, etc.) to the cyan values.
- **Semantic slots**: Map PrimeNG's `colorScheme.light` / `colorScheme.dark` so both themes resolve automatically from one preset.
- **Border radius**: Override `borderRadius` tokens to match Arena radii (sm=4, md=8, lg=12, xl=20).

This single file change makes every `p-card`, `p-button`, `p-tabs`, `p-dialog` etc. inherit the Arena palette.

#### 0.2 — Populate `theme.scss` with custom Arena tokens ✅

Add non-PrimeNG tokens to `apps/app/src/styles/theme.scss`:

```
--g-accent, --g-accent-muted
--g-win, --g-win-muted
--g-loss, --g-loss-muted
--g-pending, --g-pending-muted
--g-gradient-primary, --g-gradient-rank
```

These are set in `:root` (dark) and `.light-theme` (light). They're the only custom CSS variables we maintain — everything else flows from PrimeNG.

#### 0.3 — Add typography scale tokens to `theme.scss` ✅

Define `--t-stat-xl`, `--t-stat-lg`, `--t-stat-md`, `--t-display`, `--t-heading`, `--t-body`, `--t-body-sm`, `--t-eyebrow`, `--t-mono` in `:root`.

#### 0.4 — Register Google Fonts ✅

Add the Space Grotesk / Inter / JetBrains Mono font link to `apps/app/src/index.html` with `display=swap`.

#### 0.5 — Update ThemeService default ✅

Change `DEFAULT_THEME` from `'light'` to `'dark'` in `libs/frontend/modules/theme/src/theme.service.ts` and update `localStorage` key to `gladman:theme` per design spec.

#### 0.6 — Add reusable typography utility classes ✅

Add to `theme.scss` a small set of utility classes used across the design: `.t-eyebrow`, `.t-stat-xl`, `.t-stat-lg`, `.t-stat-md`, `.t-display`, `.t-heading`, `.t-mono`, `.t-muted`. These are thin wrappers over the CSS variables — no layout, just font.

---

### Phase 1 — Shell & Navigation ✅ COMPLETE

> Goal: The app chrome (top bar, nav, search, avatar, footer) matches the Arena design.
>
> **Status: Shell redesigned with Arena top bar, logo, nav, avatar. Build verified.**

#### 1.1 — Redesign `ShellComponent` top bar ✅

Replace the current `p-toolbar` based header with an Arena-style top bar:

- Sticky, 56px tall, `bg-surface-0` with 1px bottom border.
- Left: Logo (gradient parallelogram mark + "GLADMAN" in Space Grotesk 700) + horizontal nav links.
- Right: Search input (surface-100 bg, surface-200 border, placeholder icon), notification bell, theme toggle, user avatar.
- Active nav item: primary-colored text with 2px underline.
- Use `tailwindcss-primeui` surface utilities: `bg-surface-0`, `border-surface-200`, `text-surface-900`, etc.
- Keep Tailwind classes minimal: `flex items-center gap-5 px-6 h-14 sticky top-0 z-50` etc.

#### 1.2 — Create `LogoComponent` ✅

Implemented inline in the shell component as CSS-only logo mark (gradient parallelogram). Can be extracted to a standalone component later if needed elsewhere.

#### 1.3 — Create `SearchBarComponent` ✅

Existing `SearchComponent` kept as-is — already has autocomplete with proper styling. Lives at `shell/src/components/search/`.

#### 1.4 — Create `UserAvatarComponent` ✅

Implemented inline in the shell as `.g-avatar` class. Gradient circle with user initials.

#### 1.5 — Mobile nav ✅

Updated mobile layout: hamburger + logo row, search below. Slide-in sidebar with nav links using Arena styling.

---

### Phase 2 — Shared Reusable Components ✅ COMPLETE

> Goal: Build the recurring visual blocks used across Player and Club pages so page-specific work is fast.
>
> **Status: All 8 components created, path aliases registered, build verified.**

#### 2.1 — `StatCardComponent` ✅

Path: `libs/frontend/components/stat-card/` · Import: `@app/frontend-components/stat-card`

Presentational card with eyebrow label, stat value, optional delta with directional coloring (win/loss/neutral), and `<ng-content>` for custom inner content. Uses `bg-surface-100 border border-surface-200 rounded-xl p-5` Tailwind layout. SCSS only for delta color via `data-dir` attribute selector.

#### 2.2 — `EyebrowLabelComponent` → skipped

Not needed as a standalone component. The `.t-eyebrow` utility class from `theme.scss` handles this. Usage: `<span class="t-eyebrow">LABEL</span>`.

#### 2.3 — `TierBadgeComponent` ✅

Path: `libs/frontend/components/tier-badge/` · Import: `@app/frontend-components/tier-badge`

The diagonal clip-path level badge. Inputs: `level` (required), `size` ('default' | 'sm'), `label` (optional prefix e.g. "LVL"). SCSS for clip-path, gradient background, and font-family — all things Tailwind can't do.

#### 2.4 — `SparklineComponent` ✅

Path: `libs/frontend/components/sparkline/` · Import: `@app/frontend-components/sparkline`

Mini bar chart showing recent form. Input: `bars: SparkBar[]` where each bar has `height` (%) and optional `status` ('win' | 'loss'). Tailwind for flex layout, SCSS for bar colors from CSS variables.

#### 2.5 — `FormSequenceComponent` ✅

Path: `libs/frontend/components/form-sequence/` · Import: `@app/frontend-components/form-sequence`

Row of W/L square dots. Input: `results: ('W' | 'L')[]`. 22×22px rounded-sm dots with win-muted/loss-muted backgrounds. Tailwind for layout, SCSS for CSS variable colors and Space Grotesk font.

#### 2.6 — `ChipComponent` → deferred

PrimeNG's `p-chip` with custom variants will be styled via the theme preset rather than a wrapper component. Variant classes (`.g-chip--win`, `.g-chip--loss`, etc.) can be added to `theme.scss` if needed during Phase 3/4.

#### 2.7 — `MatchRowComponent` ✅

Path: `libs/frontend/components/match-row/` · Import: `@app/frontend-components/match-row`

The most complex shared component. Grid layout: `4px band | body (meta+players) | scores | points-delta`. Inputs via `MatchRowData` interface with league, teams, players (with own-player highlight), scores, outcome, and points delta. Uses `TierBadgeComponent` for player levels. SCSS for: grid-template-columns, band color by outcome, own-player dot pseudo-element, mono fonts, score/points coloring.

#### 2.8 — `UpcomingMatchCardComponent` ✅

Path: `libs/frontend/components/upcoming-match/` · Import: `@app/frontend-components/upcoming-match`

Card with left date column (day/number/time), match info (league chip, teams, full date), and `<ng-content>` for action button. Left primary accent bar via `::before`. SCSS for grid columns, accent bar, date/time fonts.

#### 2.9 — `SectionHeaderComponent` ✅

Path: `libs/frontend/components/section-header/` · Import: `@app/frontend-components/section-header`

Flex row: eyebrow title (left) + projected slots for badge and action (right). Input: `title` (required). Content projection via `select="[badge]"` and `select="[action]"` attributes. Pure Tailwind — no SCSS needed.

#### 2.10 — `HeroComponent` ✅

Path: `libs/frontend/components/hero/` · Import: `@app/frontend-components/hero`

Gradient hero panel with content projection slots: `[avatar]`, `[identity]`, `[actions]`, `[stats]`, and default slot. Radial gradient background + diagonal scanline accent via `::before` pseudo-element. Tailwind for layout grid, SCSS for gradients and mask.

---

### Phase 3 — Player Page ✅ COMPLETE

> Goal: Redesign the player detail page to match the "Glenn Latomme" prototype.
>
> **Status: Page restructured with Arena hero, gradient avatar, rank panel, two-column layout. Build verified.**

#### 3.1 — Player Hero section ✅

Replaced the old `PageHeaderComponent` + `ShowLevelComponent` layout with:
- `HeroComponent` — gradient background with radial glows + scanline accent
- Parallelogram clip-path avatar with gradient text initials
- Player name in Space Grotesk 700, 3rem
- Meta row: club link with shield icon, memberId mono chip
- Action buttons: Head-to-head (outlined), edit menu

Ranking data now loaded directly via `ShowLevelService.getRanking()` called from an effect in `PageDetailComponent`, removing the dependency on `ShowLevelComponent` as a child.

#### 3.2 — Rank Panel (inside hero) ✅

3-column grid (singles/doubles/mixed) inside the hero, separated by border-top. Each slot:
- Discipline label (uppercase, 0.875rem, tracked)
- `TierBadgeComponent` with "LVL" prefix
- Large gradient rank number (4rem, `--g-gradient-rank` text)
- "RANKING" eyebrow + upgrade/downgrade points in JetBrains Mono

Sparkline bars deferred — requires ranking history query not yet available.

#### 3.3 — Stats Strip → deferred

Requires new data (match count, win rate, form sequence) not available in current GraphQL queries. Will be added when backend provides aggregate player stats.

#### 3.4 — Main grid layout ✅

Two-column layout: `grid-cols-[1fr_340px]` with left column for games and right sidebar for ranking progress card. Existing `RecentGamesComponent` and `UpcomingGamesComponent` preserved in the left column with eyebrow section headers.

#### 3.5 — Ranking Progress sidebar card ✅

Shows all three disciplines with level, upgrade points (green), and downgrade points. Uses the same `ShowLevelService` data. Styled with `bg-surface-100` card pattern.

#### 3.6 — Sidebar cards (Season Record, Matchups, Teams) → deferred

Require new data queries. Structure is ready — add cards to the `<aside>` column when backend data becomes available.

---

### Phase 4 — Club Page

> Goal: Redesign the club detail page to match the "Smash For Fun" prototype.

#### 4.1 — Club Hero section

Use `HeroComponent` with:
- Club crest (parallelogram with club abbreviation)
- Club name (Space Grotesk 700, 2.75rem)
- Meta row: club ID mono chip, federation chip, season, member count, established year
- Action buttons: Share (secondary), Follow Club (primary)

#### 4.2 — Club Stats Strip (inside hero)

4-column grid: Teams Active, Season Record, Club Ranking, Next Home Match. Use `StatCardComponent` pattern but render these inline in the hero (below the identity row, separated by a border-top).

#### 4.3 — Tab navigation

Rewrite the tab bar to match Arena design: `p-tabs` with 2px primary underline active indicator, flush bottom. Tabs: Teams Overview, Players, Schedule, Tournaments, Line-ups.

Use PrimeNG's `p-tabs` with style overrides from the preset.

#### 4.4 — Teams Overview tab

This is the main tab. Components needed:

##### 4.4.1 — `TeamFilterBarComponent`

- Team count label
- Segmented control (All / Men / Women / Mixed)
- Segmented control (Interclub / PBO / Jeugd)
- Sort selector

##### 4.4.2 — `TeamCardComponent`

The big card for each team. Layout:
- Top band (3px gradient, expands to 100% on hover)
- Header: team code square, team name, division + gender badge, win% chip
- Captain row: avatar, name, "CAPTAIN" label, contact icons
- Roster summary: "ROSTER · N" + M/W stats
- Player list: rows with avatar, name, role, level badges (S/D/M), form dots
- Footer: "+N more on roster" + "View team →" link

This component fetches its own team data (players, stats) given a `teamId` input.

##### 4.4.3 — `PlayerRowComponent`

Used inside `TeamCardComponent`. Shows: initials avatar, name, optional role tag, tier badges (colored by discipline), form dots. Highlights "own player" row.

#### 4.5 — Right Sidebar

##### 4.5.1 — `ClubScheduleCardComponent`

"UPCOMING · CLUB" header + list of fixture rows (day/date + teams + league). Links to full schedule.

##### 4.5.2 — `TopPerformersCardComponent`

"TOP PERFORMERS · SEASON" header + ranked list of players with name, team/level meta, and win% value. W% toggle.

##### 4.5.3 — `ClubInfoCardComponent`

Basic club info: address, contact, founded date, federation.

#### 4.6 — Remaining tabs

- **Players tab**: Reuse `PlayerRowComponent` in a full list with search/filter.
- **Schedule tab**: Reuse `ClubScheduleCardComponent` pattern in a full page view.
- **Tournaments tab**: Existing `ClubTournamentsTabComponent` re-themed.
- **Line-ups tab**: New or re-themed from `ClubTeamBuilderTabComponent`.

---

### Phase 5 — Polish & Responsive

#### 5.1 — Responsive breakpoints

- `< 1100px`: Single column layout (no sidebar), stat strips go to 2-col, heroes stack.
- `< 768px`: Mobile nav, match rows hide scores/points columns.

#### 5.2 — Motion

- 150ms hover/focus transitions (already in PrimeNG defaults)
- 250ms tab switches
- 400ms page transitions (ViewTransitions API already configured)
- Live match pulse animation on pending chips

#### 5.3 — Light mode verification

Since all colors flow from PrimeNG preset dark/light modes + `--g-*` variables with `.light-theme` overrides, test each component in both modes. Fix any contrast issues.

#### 5.4 — Accessibility pass

- Ensure all interactive elements have proper focus states
- Verify color contrast ratios (WCAG AA minimum)
- Add aria-labels to icon-only buttons

---

### Implementation Order Summary

| #   | Task                              | Depends On | Scope             |
| --- | --------------------------------- | ---------- | ----------------- |
| 0.1 | Theme preset (colors/radii)       | —          | `theme.preset.ts` |
| 0.2 | Custom tokens in `theme.scss`     | —          | `theme.scss`      |
| 0.3 | Typography tokens                 | —          | `theme.scss`      |
| 0.4 | Google Fonts                      | —          | `index.html`      |
| 0.5 | ThemeService defaults             | —          | `theme.service.ts`|
| 0.6 | Typography utility classes        | 0.3        | `theme.scss`      |
| 1.1 | Shell top bar redesign            | 0.*        | Shell component   |
| 1.2 | LogoComponent                     | 0.*        | New component     |
| 1.3 | SearchBarComponent                | 0.*        | Existing refactor |
| 1.4 | UserAvatarComponent               | 0.*        | New component     |
| 1.5 | Mobile nav                        | 1.1        | Shell component   |
| 2.1 | StatCardComponent                 | 0.*        | New component     |
| 2.2 | EyebrowLabel (class only)         | 0.6        | `theme.scss`      |
| 2.3 | TierBadgeComponent                | 0.*        | New component     |
| 2.4 | SparklineComponent                | 0.*        | New component     |
| 2.5 | FormSequenceComponent             | 0.*        | New component     |
| 2.6 | ChipComponent                     | 0.*        | New component     |
| 2.7 | MatchRowComponent                 | 2.3, 2.6   | New component     |
| 2.8 | UpcomingMatchCardComponent        | 2.6        | New component     |
| 2.9 | SectionHeaderComponent            | 0.*        | New component     |
| 2.10| HeroComponent                     | 0.*        | New component     |
| 3.1 | Player hero                       | 2.10, 1.4  | Page refactor     |
| 3.2 | Rank panel                        | 2.3, 2.4   | Page refactor     |
| 3.3 | Stats strip                       | 2.1, 2.5   | Page refactor     |
| 3.4 | Upcoming section                  | 2.8, 2.9   | Page refactor     |
| 3.5 | Recent matches list               | 2.7, 2.6   | Page refactor     |
| 3.6 | Sidebar cards                     | 2.1        | New components    |
| 4.1 | Club hero                         | 2.10       | Page refactor     |
| 4.2 | Club stats strip                  | 2.1        | Page refactor     |
| 4.3 | Tab navigation                    | 0.*        | Preset override   |
| 4.4 | Teams overview tab                | 2.3, 2.5   | Tab refactor      |
| 4.5 | Club sidebar                      | 2.1        | New components    |
| 4.6 | Remaining club tabs               | 4.3        | Tab refactors     |
| 5.1 | Responsive                        | 3.*, 4.*   | All components    |
| 5.2 | Motion                            | 3.*, 4.*   | `theme.scss`      |
| 5.3 | Light mode                        | 5.1        | Testing           |
| 5.4 | Accessibility                     | 5.3        | Testing           |

---

### Component Library Location

All new shared components go into `libs/frontend/components/` as separate Nx library entry-points (or sub-folders of existing ones). Page-specific components stay in their respective page libs under `libs/frontend/pages/{player,club}/`.

Suggested new component library structure:

```
libs/frontend/components/
├── arena/                    # New: Arena design system components
│   ├── stat-card/
│   ├── tier-badge/
│   ├── sparkline/
│   ├── form-sequence/
│   ├── chip/                 # Or extend existing PrimeNG chip
│   ├── match-row/
│   ├── upcoming-match/
│   ├── section-header/
│   ├── hero/
│   ├── logo/
│   └── user-avatar/
├── shell/                    # Existing: updated
├── page-header/              # Existing: may be replaced by hero
├── games/                    # Existing: refactored
│   ├── recent/               # Uses MatchRowComponent
│   └── upcoming/             # Uses UpcomingMatchCardComponent
└── ...
```

### Notes

- **No new npm dependencies.** Everything uses PrimeNG + Tailwind + PrimeIcons (already installed).
- **No `dark:` Tailwind classes.** PrimeNG's `darkModeSelector: '.dark-theme'` + preset color schemes handle everything.
- **Minimal Tailwind per element.** Prefer `bg-surface-100 rounded-xl p-5` over a chain of 10+ classes. If a pattern repeats, it becomes a component — not a utility class chain.
- **Each component loads its own data.** Parent pages compose components; they don't fetch everything and pass it down. This keeps components independently reusable and lazily loaded.
