# Assembly Page — Analysis & Migration Document

> **Target audience:** Claude Code (automated implementation)
> **Source:** `https://legacy.badman.app/competition/assembly`
> **Current stack:** Angular 20 + Angular Material + CDK Drag & Drop
> **Target stack:** Angular + PrimeNG
> **Date:** 2026-04-03

---

## 1. Page Overview

The **Ploegopstelling** (Team Assembly) page allows club administrators to compose a team lineup for a badminton competition encounter. Users select a season, club, team, and encounter via a filter bar, then assign players from an available pool into specific game slots (doubles, singles, mixed) using **drag-and-drop**.

**Current URL pattern:**

```
/competition/assembly?season=2025&club={uuid}&team={uuid}&encounter={uuid}
```

All four filter values are synced to URL query parameters for deep-linking.

### 1.1 Page Lifecycle & Loading Flow

1. Page initializes with a `FormGroup` containing controls: `season`, `club`, `team`, `encounter`, `event`
2. Season defaults to the current season via `getSeason()`, or from `?season=` query param
3. When **team** and optionally **encounter** change, `loadData()` is called
4. `loadData()` clears all slot arrays, fetches team data (players, rankings), and loads any saved assembly
5. Once loaded, `updatedAssembly$` subject triggers validation via the `validateAssembly` GraphQL query
6. A `mat-progress-bar` (indeterminate) is shown while loading; the assembly section is hidden until `loaded = true`
7. The assembly is **read-only until a team is selected** (`gotRequired` flag gates the entire section)

---

## 2. Component Architecture

### 2.1 Component Tree

```
badman-assembly-create                  ← Page-level smart component
├── h1 "Ploegopstelling"
├── section.select-encounter            ← Filter bar
│   ├── badman-select-season            → mat-select
│   ├── badman-select-club              → mat-autocomplete (text input)
│   ├── badman-select-team              → mat-select
│   ├── badman-select-encounter         → mat-select
│   └── button.download-assembly        → "Download"
│
└── section.assembly
    └── badman-assembly                 ← Main assembly component
        └── section
            ├── div.information         ← Read-only summary panels (flex-row, gap:16px)
            │   ├── div.team            → "Titularissen" (Index + titulars + total rankings)
            │   ├── div.base            → "Basisspelers" (Index + base players + rankings)
            │   └── div.errors          → "Fouten" (validation errors or green success)
            │
            └── div.assembly            ← flex-row: 33% left / 66% right, gap:16px
                │
                ├── div.team-info       ← LEFT COLUMN (flex-basis: 33%)
                │   ├── div.captain
                │   │   └── badman-player-search (Ploegkapitein autocomplete)
                │   │
                │   ├── div#playerList  ← [CDK-DROP-LIST] Draggable player pool
                │   │   ├── label "Mogelijke titularissen"
                │   │   ├── badman-assembly-player [CDK-DRAG] × N
                │   │   ├── mat-divider
                │   │   ├── div.expandable-item ("Reservespelers" toggle)
                │   │   └── div.backup
                │   │       └── badman-assembly-player [CDK-DRAG] × N
                │   │
                │   ├── div.add-player
                │   │   └── badman-player-search ("Voeg speler toe")
                │   │
                │   └── div.change-team
                │       └── badman-has-claim (auth-gated, conditional)
                │
                └── div.current-assembly ← RIGHT COLUMN (flex-basis: 66%, flex-col)
                    ├── div#double1List  [DROP] .double → "Heren Dubbel"     (max 2)
                    ├── div#double2List  [DROP] .double → "Dames Dubbel"     (max 2)
                    ├── div#double3List  [DROP] .double → "Gemengd 1"        (max 2)
                    ├── div#double4List  [DROP] .double → "Gemengd 2"        (max 2)
                    ├── div#single1List  [DROP] .single → "Heren Enkel 1"    (max 1)
                    ├── div#single2List  [DROP] .single → "Heren Enkel 2"    (max 1)
                    ├── div#single3List  [DROP] .single → "Dames Enkel 1"    (max 1)
                    ├── div#single4List  [DROP] .single → "Dames Enkel 2"    (max 1)
                    ├── mat-divider
                    └── div#substitudeList [DROP] → "Invallers" (substitutes)
```

### 2.2 Sub-Components

| Component                 | Purpose                               | Current Material Used                |
| ------------------------- | ------------------------------------- | ------------------------------------ |
| `badman-assembly-create`  | Page container, filter bar + assembly | —                                    |
| `badman-assembly`         | Main assembly logic, drag-drop state  | CDK DragDrop                         |
| `badman-assembly-player`  | Single player card (name + ranking)   | —                                    |
| `badman-player-search`    | Autocomplete search for players       | `mat-form-field`, `mat-autocomplete` |
| `badman-select-season`    | Season dropdown                       | `mat-select`                         |
| `badman-select-club`      | Club search with typeahead            | `mat-autocomplete`                   |
| `badman-select-team`      | Team dropdown                         | `mat-select`                         |
| `badman-select-encounter` | Encounter dropdown                    | `mat-select`                         |
| `badman-has-claim`        | Auth-gated content (change team)      | —                                    |

---

## 3. Feature Inventory

### 3.1 Filter Bar (`section.select-encounter`)

| Control   | Type                    | Current Component     | Example Value                            |
| --------- | ----------------------- | --------------------- | ---------------------------------------- |
| Season    | Dropdown                | `mat-select`          | "2025 - 2026"                            |
| Club      | Autocomplete text input | `mat-autocomplete`    | "Smash For Fun"                          |
| Team\*    | Dropdown (required)     | `mat-select`          | "Smash For Fun 1G"                       |
| Encounter | Dropdown (not required) | `mat-select`          | "za. 4 apr. 2026 19:00 Pluimplukkers 6G" |
| Download  | Split button            | `button` + `mat-menu` | Generates PDF + Save option              |

All values sync to URL query params (`season`, `club`, `team`, `encounter`).

**Filter dependencies:**

- Team list updates when `club` or `season` changes (via `[updateOn]="['club', 'season']"`)
- Encounter list updates when team changes
- Encounter fires `(encounterSelected)` event which sets the `event` form control

**Download split button behavior:**

- Left side: "Download" button — generates PDF
- Right side (logged in only): dropdown arrow → mat-menu with "Save" option
- Download shows spinner while loading (`[class.spinner]="this.pdfLoading"`)
- Save shows spinner while saving (`[class.spinner]="this.saveLoading"`)
- Both buttons are disabled during their respective loading states

### 3.2 Download & Save Logic

#### Download (PDF)

1. Before downloading, checks if assembly is **valid** via `validationOverview.valid`
2. If **not valid**, opens a **confirmation dialog** showing the validation warnings/errors template
   - Dialog: "There are warnings" title
   - Content: renders the `validationOverview.template` via `ngTemplateOutlet`
   - Actions: "Agree" button (proceeds) and "Cancel" button (aborts)
3. If valid (or user agreed), generates the PDF:
   - If encounter is selected: fetches encounter details (home/away team names) for filename
   - Filename format: `YYYY-MM-DD HH:mm - HomeTeam vs AwayTeam.pdf` (or just `YYYY-MM-DD HH:mm.pdf` without encounter)
   - Calls `PdfService.getTeamAssembly()` with all slot data (player IDs)
   - Creates a Blob URL and triggers download via a programmatic anchor click
4. Auto-resets loading spinner after 5 seconds (failsafe timeout)

#### Save (GraphQL Mutation)

1. Same validation dialog check as download
2. Calls `createAssembly` GraphQL mutation with:
   - `systemId`, `captainId`, `teamId`, `encounterId`
   - All single slots: player ID (single value)
   - All double slots: array of player IDs
   - `subtitudes`: array of substitute player IDs
3. On success: shows "Saved" snackbar (2s, success class)
4. On error: shows "Failed to save" snackbar (2s, error class)
5. Refetches saved assemblies after mutation completes

### 3.3 Information Panels (`div.information`)

Three read-only summary panels in a horizontal flex row (gap: 16px):

1. **Basisspelers (Base players)** — Team index (e.g. "Index: 132") + base player list
2. **Titularissen (Titulars)** — Titular index (e.g. "Index: 72") + titular player list
3. **Fouten (Errors)** — Validation results rendered via `ng-template #validationOverview`

**Panel labels are confusingly swapped in the UI** — the div with class `team` shows "Basisspelers" (base) translation key, and the div with class `base` shows "Titularissen" (team) translation key. Keep the same behavior.

**Ranking display in panels:**

- Format: `PlayerName S - D (sum)` for M/F types
- Format: `PlayerName S - D - M (sum)` for MX type
- Sum = single + double + (mix if MX)
- Default ranking value is **12** if not available (e.g. `player?.single ?? 12`)

**Level exception indicator:**

- Players with `levelException: true` in `team.entry.meta.competition.players` show a lock icon 🔒
- Displayed as `<mat-icon>lock</mat-icon>` with tooltip "Level exemption"
- Shows both in info panels and in player cards

**Responsive behavior:**

- Ranking numbers are hidden on small screens (`notSmallScreen` flag based on container resize, width <= 200px)
- On screens <= 600px: panels stack vertically (flex-direction: column, max-width: 100%)

### 3.4 Player Pool (`div.team-info` — left column, 33%)

#### Captain Selector

- Uses `badman-player-search` component (autocomplete)
- Pre-filled with saved captain or team's default captain
- `[allowCreation]="false"` — cannot create new players
- `[club]` bound to the selected club ID
- `[clearOnSelection]="false"` — keeps the selection visible
- `(whenSelectPlayer)` → sets `captain` form control to player ID

#### Player List (CDK Drop List `#playerList`)

- Data source: `players.REGULAR` concatenated with `players.BACKUP`
- Connected to ALL other drop lists (bidirectional)
- **Sorting disabled** within the player pool (`[cdkDropListSortingDisabled]="true"`)
- Players are categorized by `TeamMembershipType`:
  - `REGULAR` — shown immediately
  - `BACKUP` — shown in collapsible section below a divider

##### Player Sorting Logic

- Primary sort: **gender** (F before M)
- Secondary sort: **sum of rankings** (single + double + mix if MX)
- Tertiary (tiebreak): **single ranking**
- Sorting applied: REGULAR list, BACKUP list, substitutes, doubles (by double ranking), mixed doubles (by gender then double ranking)

#### Collapsible Reserve/Backup Section

- Only shown when `players.BACKUP.length > 0`
- Separated by `mat-divider`
- Clickable header: "Reservespelers" with expand_more/expand_less icon
- Toggled via `showBackup` boolean
- Hidden via CSS class `.hidden` (height: 0, visibility: hidden)
- Backup players are also draggable with same properties

#### Add Player (`badman-player-search`)

- Label: "Voeg speler toe" (hardcoded, not translated)
- `[allowCreation]="false"` — search only
- `[searchOutsideClub]="false"` — limited to club players
- `[club]` bound to selected club
- `[validationFunction]` — checks:
  - If player already in REGULAR list → invalid with "in-list" message
  - If player already in BACKUP list → invalid with "backup-player" message
- `[where]` — gender filter: `{ gender: undefined }` for MX, or team type for M/F
- `[ignorePlayers]` — list of already-known players
- On selection: calls `addPlayer()` which:
  1. Fetches full player info via GraphQL (rankings, gender, etc.)
  2. Pushes to `players.REGULAR` array
  3. Re-sorts lists
  4. Triggers change detection

#### Change Team Section

- Wrapped in `badman-has-claim` — only visible with claims `[clubId]_edit:team` or `edit-any:club`
- Shows "Change team" text + "Edit" button
- Opens `EditDialogComponent` modal (600px max-width) with team data
- Purpose: modify the team composition (add/remove base players)

### 3.5 Game Slots (`div.current-assembly` — right column, 66%)

All slots are CDK drop lists connected to the player pool and to each other.

**Slot labels are dynamic** based on team type (M, F, or MX):

| Team Type | double1           | double2           | double3           | double4           | single1          | single2          | single3          | single4          |
| --------- | ----------------- | ----------------- | ----------------- | ----------------- | ---------------- | ---------------- | ---------------- | ---------------- |
| **M**     | Males Double 1    | Males Double 2    | Males Double 3    | Males Double 4    | Males Single 1   | Males Single 2   | Males Single 3   | Males Single 4   |
| **F**     | Females Double 1  | Females Double 2  | Females Double 3  | Females Double 4  | Females Single 1 | Females Single 2 | Females Single 3 | Females Single 4 |
| **MX**    | Mix 1 (no prefix) | Mix 2 (no prefix) | Mix 3 (no prefix) | Mix 4 (no prefix) | Males Single 1   | Males Single 2   | Females Single 1 | Females Single 2 |

> Note: For MX, singles 3&4 reuse "Single 1"/"Single 2" translation keys with female prefix.

**Double slots** (min-height: 70px):

| Slot ID       | Max Players |
| ------------- | ----------- |
| `double1List` | 2           |
| `double2List` | 2           |
| `double3List` | 2           |
| `double4List` | 2           |

**Single slots** (min-height: 35px):

| Slot ID       | Max Players |
| ------------- | ----------- |
| `single1List` | 1           |
| `single2List` | 1           |
| `single3List` | 1           |
| `single4List` | 1           |

**Substitutes** (min-height: 35px, separated by `mat-divider`):

| Slot ID          | Max Players |
| ---------------- | ----------- |
| `substitudeList` | Unlimited   |

> **Note:** There is a typo in the legacy code: `substitudeList` and `subtitudes` should be `substituteList` and `substitutes`. Also in the GraphQL schema/model the field is `subtitudes`.

### 3.6 Ranking Display Logic per Slot

Player rankings follow format based on slot type and event type:

| Context                               | Display Format                 | Example                          |
| ------------------------------------- | ------------------------------ | -------------------------------- |
| Player pool (no showType)             | S - D (for M/F)                | `8 - 7`                          |
| Player pool (no showType, MX)         | S - D - M                      | `8 - 7 - 7`                      |
| In single slot (`showType=single*`)   | Only Single ranking            | `8`                              |
| In double slot (`showType=double1/2`) | Only Double ranking            | `7`                              |
| In mixed slot (MX, `double3/4`)       | Only Mix ranking               | `7`                              |
| Information panels                    | S - D (sum) or S - D - M (sum) | `8 - 7 (15)` or `8 - 7 - 7 (22)` |

Default ranking value when not available: **12** (the lowest ranking level).

### 3.7 Drag and Drop Behavior — Detailed Rules

#### Drop Predicate (`canDropPredicate`)

The `canDropPredicate` function determines if a player can be dropped into a specific slot. Rules:

1. **Capacity check:**
   - Single slots: reject if already has 1 player
   - Double slots: reject if already has 2 players

2. **Substitute slot restrictions:**
   - Cannot drop a player into substitutes if they are already assigned to ANY game slot (single or double)
   - This prevents duplicate assignments

3. **Duplicate check:**
   - Cannot drop a player into a slot that already contains them

4. **Gender restrictions (MX type only):**
   - `double1` (Men's Doubles): reject female players
   - `double2` (Women's Doubles): reject male players
   - `double3`, `double4` (Mixed): must have exactly 1M + 1F; reject if same gender already present
   - `single1`, `single2`: reject female players (Men's Singles)
   - `single3`, `single4`: reject male players (Women's Singles)

5. **No gender restrictions** for M or F team types (all players same gender)

#### Drop Handler (`drop()`)

When a player is dropped:

1. **Same container:** reorder within the array (`moveItemInArray`)
2. **From player pool to slot/sub:**
   - Uses `copyArrayItem` (player remains in pool, copy goes to slot)
   - Additional duplicate checks:
     - If player already in any single slot → cannot add to another single slot
     - If player already in 2+ double slots → cannot add to another double slot
3. **Between game slots (not from pool):**
   - Uses `transferArrayItem` (player moves, removed from source)
4. **To player pool:**
   - If player already in pool data → remove from previous container (effectively removing from slot)
5. **Auto-remove from substitutes:**
   - When dropping into a game slot (not substitutes), automatically removes that player from substitutes list

After every drop: triggers `updatedAssembly$` which re-validates the assembly and updates form controls.

### 3.8 Saved Assembly Loading

When an encounter is selected and user is logged in:

1. Queries `encounterCompetition.assemblies` filtered by `captainId` and `playerId` (current user)
2. Takes the first result
3. Shows "Saved assembly loaded" snackbar (2s)
4. Populates:
   - Captain from saved or team default
   - All double/single/substitute slots from saved assembly
5. **Handles missing players:** if a saved assembly references players not in the current team roster:
   - Fetches each missing player's full info via GraphQL
   - Adds them to the REGULAR players list
   - This allows previously valid assemblies to load even if team composition changed

### 3.9 Ranking Date Calculation

Rankings are fetched for a specific date range:

- **Without encounter:** uses current date, start of month to end of month
- **With encounter:** navigates the event hierarchy:
  1. `encounterCompetition` → `drawCompetition` → `subEventCompetition` → `eventCompetition`
  2. Uses `season`, `usedRankingUnit`, `usedRankingAmount` from the event
  3. Calculates ranking period (start of month to end of month for the specified period)
- Rankings fetched: `rankingPlaces` (for the calculated period) + `rankingLastPlaces` (latest known)
- System ID from `RankingSystemService`

### 3.10 Assembly Validation (Server-Side)

Validation is performed via the `validateAssembly` GraphQL query:

**Input:** `AssemblyInput` with:

- `captainId`, `teamId`, `encounterId`
- `single1-4`: single player IDs
- `double1-4`: arrays of player IDs
- `subtitudes`: array of player IDs

**Output:** `ValidationResult` with:

- `baseTeamIndex`: number — team base index
- `baseTeamPlayers`: array of player objects with single/double/mix rankings
- `titularsIndex`: number — titulars index
- `titularsPlayers`: array of player objects with single/double/mix rankings
- `valid`: boolean — overall validity
- `errors`: array of `{ message, params }` — blocking errors
- `warnings`: array of `{ message, params }` — non-blocking warnings

**Error/Warning Display:**

- Errors shown in red list (error-list class)
- Warnings shown in separate list (warning-list class)
- Each message rendered by `AssemblyMessageComponent`:
  - Translates the `message` key with interpolated `params`
  - Params can include: `game1`, `game2`, `gender`, `players` (array of player names/rankings), `index`, `minMax`, `maxLevel`
  - All are translated/resolved from the validation data before being passed to `translate.get()`
- When no errors and no warnings: shows green "Geen fouten gevonden" (No errors found)

### 3.11 Auth / Permissions

- Page viewable without login (read-only: can view assembly structure but not save)
- `loggedIn()` computed signal controls visibility of:
  - Save button in the download dropdown menu
- `badman-has-claim` Controls visibility of:
  - "Change team" section — requires `[clubId]_edit:team` or `edit-any:club` claims
- Saved assembly loading only occurs when logged in
- Save mutation requires authentication (server-side enforced)

### 3.12 Player Card (`TeamAssemblyPlayerComponent`) Details

Each player card displays:

- **Competition status warning:** If `player.competitionPlayer === false`, shows a ⚠️ warning icon with tooltip explaining the player doesn't have competition status
- **Player name:** `player.fullName`
- **Level exception badge:** Lock icon 🔒 if player has level exception, with tooltip
- **Ranking:** Dynamic based on `showType` input (see Section 3.6)

### 3.13 Form Control Structure

The `FormGroup` used across the page:

```
FormGroup
├── season: FormControl (number, e.g. 2025)
├── club: FormControl (string, club ID)
├── team: FormControl (string, team ID)
├── encounter: FormControl (string, encounter ID)
├── event: FormControl (EncounterCompetition object)
├── captain: FormControl (string, player ID)
├── single1: FormControl (TeamPlayer object)
├── single2: FormControl (TeamPlayer object)
├── single3: FormControl (TeamPlayer object)
├── single4: FormControl (TeamPlayer object)
├── double1: FormControl (TeamPlayer[] array)
├── double2: FormControl (TeamPlayer[] array)
├── double3: FormControl (TeamPlayer[] array)
├── double4: FormControl (TeamPlayer[] array)
└── subtitudes: FormControl (TeamPlayer[] array)
```

> Note: singles store single Player objects, doubles/substitutes store arrays. The PDF/Save functions extract `.id` from these.

---

## 4. Layout & Styling

### 4.1 Visual Layout

```
┌──────────────────────────────────────────────────────────────┐
│  Season  │  Club (autocomplete)  │  Team*  │  Encounter  │DL│
├───────────────────┬──────────────────┬───────────────────────┤
│   Titularissen    │   Basisspelers   │       Fouten          │
│   Index: 132      │   Index: 72      │  Geen fouten gevonden │
│   Player (S-D-M)  │   Player (S-D-M) │                       │
├───────────────────┴──────────────────┴───────────────────────┤
│  LEFT COL (33%)          │  RIGHT COL (66%)                  │
│  ┌─────────────────────┐ │ ┌───────────────────────────────┐ │
│  │ Ploegkapitein       │ │ │ Heren Dubbel          [70px] │ │
│  │ [autocomplete]      │ │ ├───────────────────────────────┤ │
│  ├─────────────────────┤ │ │ Dames Dubbel          [70px] │ │
│  │ Mogelijke           │ │ ├───────────────────────────────┤ │
│  │ titularissen        │ │ │ Gemengd 1             [70px] │ │
│  │ ┌─────────────────┐ │ │ ├───────────────────────────────┤ │
│  │ │ Player  S-D-M   │ │ │ │ Gemengd 2             [70px] │ │
│  │ │ Player  S-D-M   │ │ │ ├───────────────────────────────┤ │
│  │ │ ...              │ │ │ │ Heren Enkel 1         [35px] │ │
│  │ ├─────────────────┤ │ │ ├───────────────────────────────┤ │
│  │ │ v Reservesp.    │ │ │ │ Heren Enkel 2         [35px] │ │
│  │ │ Player  S-D-M   │ │ │ ├───────────────────────────────┤ │
│  │ │ Player  S-D-M   │ │ │ │ Dames Enkel 1         [35px] │ │
│  │ └─────────────────┘ │ │ ├───────────────────────────────┤ │
│  ├─────────────────────┤ │ │ Dames Enkel 2         [35px] │ │
│  │ Voeg speler toe     │ │ ├───────────────────────────────┤ │
│  │ [autocomplete]      │ │ │ Invallers             [35px] │ │
│  └─────────────────────┘ │ └───────────────────────────────┘ │
└──────────────────────────┴───────────────────────────────────┘
```

### 4.2 CSS Details

| Element                | Style                                                                  |
| ---------------------- | ---------------------------------------------------------------------- |
| `div.assembly`         | `display: flex; flex-direction: row; gap: 16px`                        |
| `div.team-info`        | `flex-basis: 33%; flex-grow: 1`                                        |
| `div.current-assembly` | `flex-basis: 66%; flex-grow: 1; display: flex; flex-direction: column` |
| `div.information`      | `display: flex; flex-direction: row; gap: 16px`                        |
| Slot borders           | `1px solid rgba(255, 255, 255, 0.5)` with fieldset-style legend labels |
| Double slots           | `min-height: 70px`                                                     |
| Single slots           | `min-height: 35px`                                                     |
| Theme                  | Dark (background ~#333, white/light text)                              |

### 4.3 Existing Media Queries

- `(max-width: 959.98px)`
- `(max-width: 599px)`
- `screen and (max-width: 600px)`
- `(pointer: coarse)` — touch device detection (currently unused for DnD)

---

## 5. Material to PrimeNG Migration Map

| Current (Material / CDK)              | PrimeNG Replacement                                   | Notes                                   |
| ------------------------------------- | ----------------------------------------------------- | --------------------------------------- |
| `mat-select`                          | `p-select`                                            | Season, team, encounter dropdowns       |
| `mat-autocomplete` + `mat-form-field` | `p-autoComplete`                                      | Club search, captain search, add player |
| `mat-form-field` (outline)            | `p-floatLabel` + `p-inputText` / `p-select`           | Form field wrappers                     |
| `mat-icon`                            | PrimeIcons (`pi pi-chevron-down`, etc.)               | All icon instances                      |
| `mat-divider`                         | `p-divider`                                           | Horizontal separators                   |
| `mat-toolbar`                         | `p-toolbar` or custom                                 | Top navigation                          |
| `mat-sidenav`                         | `p-sidebar` or `p-menu`                               | Side navigation                         |
| `mat-menu`                            | `p-menu` or `p-tieredMenu`                            | Context menus                           |
| CDK `cdkDrag` / `cdkDropList`         | Keep CDK **or** PrimeNG `pDraggable`/`pDroppable`     | See Section 6                           |
| Fieldset-style slot borders           | `p-fieldset` with `legend`                            | Natural replacement                     |
| Expandable "Reservespelers"           | `p-panel` with `[toggleable]="true"` or `p-accordion` | Collapsible section                     |
| Validation messages                   | `p-message` / `p-messages`                            | "Fouten" panel                          |
| Info panels                           | `p-card` or `p-fieldset`                              | Titularissen / Basisspelers             |
| Download button                       | `p-button` with `icon="pi pi-download"`               | —                                       |

---

## 6. Mobile: Drag-and-Drop to Select Fallback

### 6.1 Problem

CDK / HTML5 drag-and-drop does not work on mobile/touch devices. The current app has a **partially implemented but commented-out mobile fallback** that used `badman-player-search` autocomplete components instead of drag-and-drop for each slot.

### 6.2 Old Mobile Implementation (Commented Out)

The old app had a `this.isHandset()` check (via `DEVICE` injection token) that would render a completely different layout:

```html
@if (this.isHandset()) {
<!-- MOBILE: No drag/drop — uses badman-player-search per slot -->
<div class="assembly mobile">
  <div class="current-assembly">
    <!-- Each slot gets label + N player-search autocompletes -->
    <div>
      <label>{{ double1Label }}</label>
      <badman-player-search ... />
      <!-- Player 1 -->
      <badman-player-search ... />
      <!-- Player 2 -->
    </div>
    <!-- repeat for all doubles, singles -->
  </div>
</div>
} @else {
<!-- DESKTOP: drag-and-drop -->
}
```

Key observations from the commented-out code:

- Each double slot had **2 separate** `badman-player-search` components
- Each single slot had **1** `badman-player-search` component
- All search components used the same options: `players.REGULAR.concat(players.BACKUP)`
- Had `[clearOnSelection]="false"` to keep selected player visible
- Used same validation function as "Add player"
- No player pool column was shown — just the slots with search
- The mobile layout had its own CSS class `.assembly.mobile` with `flex-direction: column`

### 6.3 New Mobile Solution

Implement a **responsive dual-mode interaction**:

- **Desktop (width > 768px):** Drag-and-drop (CDK or PrimeNG pDraggable/pDroppable)
- **Mobile (width <= 768px):** `p-select` dropdowns inside each game slot for tap-based player selection

### 6.4 Implementation Approach

```typescript
// Responsive detection via signal
isMobile = signal(window.innerWidth <= 768);

constructor() {
  // Update on resize
  fromEvent(window, 'resize').pipe(
    debounceTime(200),
    map(() => window.innerWidth <= 768)
  ).subscribe(mobile => this.isMobile.set(mobile));
}
```

```html
<!-- Template per slot -->
@if (isMobile()) {
<!-- MOBILE: Select-based assignment -->
<p-fieldset legend="Heren Dubbel">
  <p-select
    [options]="availablePlayers()"
    [(ngModel)]="slots.double1.player1"
    optionLabel="fullName"
    placeholder="Select player 1"
    [showClear]="true"
  />
  <p-select
    [options]="availablePlayers()"
    [(ngModel)]="slots.double1.player2"
    optionLabel="fullName"
    placeholder="Select player 2"
    [showClear]="true"
  />
</p-fieldset>
} @else {
<!-- DESKTOP: Drag-and-drop -->
<p-fieldset legend="Heren Dubbel">
  <div pDroppable="players" (onDrop)="onDropToSlot('double1', $event)" class="drop-zone">
    @for (player of slots.double1.players; track player.id) {
    <badman-assembly-player pDraggable="players" (onDragStart)="onDragStart(player)" [player]="player" [showRanking]="'double'" />
    }
  </div>
</p-fieldset>
}
```

### 6.5 Mobile-Specific Requirements

1. **Available player filtering:** The `p-select` options must dynamically exclude players already assigned to other slots
   - Same gender restriction rules apply as desktop (see Section 3.7 Drop Predicate)
   - Same single/double duplication rules apply
2. **Player display in select:** Show player name + relevant ranking in the dropdown option template
3. **Clear support:** `[showClear]="true"` on all selects so players can be unassigned by clearing
4. **Substitute handling:** Use multi-select or a dynamic list with add/remove for the substitute slot
5. **Trigger validation:** Every select change must trigger `updatedAssembly$` to re-validate
6. **Captain selector:** Same `p-autoComplete` on both mobile and desktop

### 6.6 Mobile Layout

On mobile (<=768px), the two-column layout should **stack vertically**:

```
┌──────────────────────┐
│ Season               │
│ Club                 │
│ Team                 │
│ Encounter            │
│ [Download]           │
├──────────────────────┤
│ Info panels (stacked)│
├──────────────────────┤
│ Ploegkapitein        │
├──────────────────────┤
│ Heren Dubbel [v][v]  │  ← p-select dropdowns
│ Dames Dubbel [v][v]  │
│ Gemengd 1    [v][v]  │
│ Gemengd 2    [v][v]  │
│ Heren Enkel 1  [v]   │
│ Heren Enkel 2  [v]   │
│ Dames Enkel 1  [v]   │
│ Dames Enkel 2  [v]   │
│ Invallers      [v]   │
├──────────────────────┤
│ Voeg speler toe      │
└──────────────────────┘
```

> Note: On mobile, the player pool list is NOT shown — players are selected directly via dropdowns in each slot. The "Add player" search at the bottom allows adding players not in the default team roster.

### 6.7 Drag-and-Drop Strategy for PrimeNG

PrimeNG does **not** have a direct equivalent to CDK's `cdkDropList` with connected lists. Three options:

| Option                               | Approach                    | Pros                               | Cons                                         |
| ------------------------------------ | --------------------------- | ---------------------------------- | -------------------------------------------- |
| **A) Keep CDK DragDrop**             | Use CDK alongside PrimeNG   | Full feature parity, battle-tested | Mixed libraries                              |
| **B) PrimeNG pDraggable/pDroppable** | Use PrimeNG drag directives | Consistent library                 | No built-in sorting, needs custom slot logic |
| **C) p-pickList / p-orderList**      | PrimeNG list components     | Built-in DnD                       | Wrong UX pattern for multi-slot assignment   |

**Recommendation:** Option A (keep CDK for desktop drag-and-drop) with PrimeNG `p-select` for mobile.

---

## 7. Data Model & GraphQL Reference

### 7.1 Existing Models to Use

All data types already exist in `@app/models`. **Do NOT create custom interfaces** — use the existing model classes:

| Model                  | Location                                                            | Key Fields for Assembly                                                                                                 |
| ---------------------- | ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `Player`               | `libs/models/models/src/models/player.model.ts`                     | `id`, `firstName`, `lastName`, `fullName` (getter), `gender`, `competitionPlayer`, `rankingLastPlaces`, `rankingPlaces` |
| `Team`                 | `libs/models/models/src/models/team.model.ts`                       | `id`, `name`, `type` (M/F/MX), `captainId`, `clubId`, `teamNumber`, `season`                                            |
| `TeamPlayerMembership` | `libs/models/models/src/models/team-player-membership.ts`           | `id`, `playerId`, `teamId`, `membershipType` (REGULAR/BACKUP)                                                           |
| `RankingLastPlace`     | `libs/models/models/src/models/ranking/ranking-last-place.model.ts` | `single`, `double`, `mix`, `playerId`, `systemId`                                                                       |
| `RankingPlace`         | `libs/models/models/src/models/ranking/ranking-place.model.ts`      | `single`, `double`, `mix`, `rankingDate`                                                                                |
| `Entry`                | `libs/models/models/src/models/event/`                              | Team entry with `meta.competition.players[].levelException`                                                             |
| `TeamMembershipType`   | `@app/models-enum`                                                  | Enum: `REGULAR`, `BACKUP`                                                                                               |

**Only custom type needed** — the validation result (not an entity, returned from a GraphQL query):

```typescript
// This is the only custom type needed — it matches the validateAssembly query response
type ValidationResult = {
  baseTeamIndex: number;
  baseTeamPlayers: (Player & { single: number; double: number; mix: number })[];
  titularsIndex: number;
  titularsPlayers: (Player & { single: number; double: number; mix: number })[];
  valid: boolean;
  errors: ValidationMessage[];
  warnings: ValidationMessage[];
};

type ValidationMessage = {
  params: { [key: string]: unknown };
  message: string; // i18n key
};
```

### 7.2 URL Query Params

Standard query parameter strings — no custom type needed, uses Angular's `ActivatedRoute.snapshot.queryParams`:

- `season`: string (e.g. "2025")
- `club`: string (UUID)
- `team`: string (UUID)
- `encounter`: string (UUID, optional)

### 7.4 GraphQL Queries

#### Team Info (main data load)

```graphql
query TeamInfo($id: ID!, $rankingWhere: JSONObject, $lastRankginWhere: JSONObject) {
  team(id: $id) {
    id
    captainId
    clubId
    teamNumber
    type # "M" | "F" | "MX"
    phone
    email
    season
    preferredDay
    preferredTime
    prefferedLocationId
    players {
      id
      slug
      fullName
      gender
      competitionPlayer
      rankingLastPlaces(where: $lastRankginWhere) {
        id
        single
        double
        mix
      }
      rankingPlaces(where: $rankingWhere) {
        id
        rankingDate
        single
        double
        mix
      }
      teamMembership {
        id
        membershipType # "REGULAR" | "BACKUP"
        teamId
      }
    }
    entry {
      id
      meta {
        competition {
          players {
            id
            levelException # boolean
          }
        }
      }
    }
  }
}
```

#### Saved Assembly

```graphql
query SavedAssembly($id: ID!, $where: JSONObject) {
  encounterCompetition(id: $id) {
    id
    assemblies(where: $where) {
      id
      assembly {
        single1
        single2
        single3
        single4
        double1 # string[]
        double2 # string[]
        double3 # string[]
        double4 # string[]
        subtitudes # string[] (typo preserved from backend)
      }
      captainId
    }
  }
}
# where: { captainId, playerId }
```

#### Validate Assembly

```graphql
query ValidateAssembly($assembly: AssemblyInput!) {
  validateAssembly(assembly: $assembly) {
    baseTeamIndex
    baseTeamPlayers {
      id
      fullName
      single
      double
      mix
    }
    titularsIndex
    titularsPlayers {
      id
      fullName
      single
      double
      mix
    }
    valid
    validators
    errors {
      params # JSON with keys: game1, game2, gender, players, index, minMax, maxLevel
      message # i18n key
    }
    warnings {
      params
      message
    }
  }
}
```

#### Save Assembly (Mutation)

```graphql
mutation CreateAssemblyMutation($assembly: AssemblyInput!) {
  createAssembly(assembly: $assembly)
}
# Input: { systemId, captainId, teamId, encounterId, single1-4, double1-4, subtitudes }
```

#### Event Info (for ranking date calculation)

```graphql
query EncounterCompetition($encounterCompetitionId: ID!) {
  encounterCompetition(id: $encounterCompetitionId) {
    id
    drawCompetition {
      id
      subEventCompetition {
        id
        eventCompetition {
          id
          season
          usedRankingUnit # e.g. "month"
          usedRankingAmount # e.g. 6
        }
      }
    }
  }
}
```

#### Encounter Details (for PDF filename)

```graphql
query GetEncounterQuery($id: ID!) {
  encounterCompetition(id: $id) {
    id
    home {
      id
      name
    }
    away {
      id
      name
    }
  }
}
```

### 7.8 Assembly State

The component state uses existing model types. No custom state interface needed — use component properties directly:

```typescript
// Component properties (all using existing model types)
team: Team;                                      // from @app/models
club: string;                                    // club ID
captain: string | null;                          // player ID
players: { [key in TeamMembershipType]: Player[] }; // REGULAR + BACKUP categorized
single1: Player[];  // max 1
single2: Player[];  // max 1
single3: Player[];  // max 1
single4: Player[];  // max 1
double1: Player[];  // max 2
double2: Player[];  // max 2
double3: Player[];  // max 2
double4: Player[];  // max 2
substitutes: Player[];  // unlimited
// Validation (from server)
errors: ValidationMessage[];
warnings: ValidationMessage[];
titulars: { index: number; players: ... };
base: { index: number; players: ... };
```

---

## 8. Improvement Recommendations

### 8.1 UX Improvements

- **Empty slot guidance:** Add dashed border + "Drop player here" placeholder text to empty slots
- **Player gender indicators:** Color-code or badge players by gender for quick slot compatibility check
- **Slot capacity indicators:** Show "0/2" or "1/1" counters so users know when a slot is full
- **Undo/Redo:** Support undo for accidental drag operations
- **Explicit save state:** The old app hides Save behind a dropdown menu — make it more prominent
- **Inline slot validation:** Highlight individual slots with issues (red border) instead of only top-level "Fouten" panel

### 8.2 Technical Improvements

- **Fix typos:** `substitudeList` → `substituteList`, `subtitudes` → `substitutes` (note: GraphQL schema still uses `subtitudes`, so the backend field name must be matched)
- **Responsive layout:** Stack columns vertically on mobile instead of rigid 33%/66% flex-row
- **Keyboard accessibility:** Ensure PrimeNG migration maintains keyboard navigation for drag-drop; mobile select fallback is inherently accessible
- **Loading states:** Add skeleton loaders / spinners while API data loads (replace `mat-progress-bar`)
- **Preserve deep-linking:** Keep URL query parameter sync for shareable/bookmarkable state
- **Touch support:** Properly implement the mobile select fallback that was commented out in the old app
- **Fix \_getPlayers bug:** Old code has `this.players.REGULAR.concat(this.players.REGULAR)` — should be `REGULAR.concat(BACKUP)`

### 8.3 Known Quirks to Preserve

- Panel label swap: div.team shows "base" translation, div.base shows "team" translation
- Ranking default of 12 for missing values
- `competitionPlayer === false` warning icon behavior
- Gender filter for player search: `undefined` for MX, team type for M/F
- Sorting: females before males in player lists

---

## 9. Migration Checklist

> Ordered implementation steps for Claude Code.

### Phase 1: Component Shell & Filter Bar

- [ ] Create `assembly-create` page component with PrimeNG layout
- [ ] Replace `mat-select` → `p-select` for season, team, encounter
- [ ] Replace `mat-autocomplete` → `p-autoComplete` for club search
- [ ] Implement download split button: `p-button` for Download + `p-menu` dropdown for Save (logged-in only)
- [ ] Preserve URL query param sync (`season`, `club`, `team`, `encounter`)
- [ ] Wire up filter dependencies: team updates on club/season change, encounter updates on team change
- [ ] Implement `encounterSelected` event handler to set event form control

### Phase 2: Core Data Loading

- [ ] Implement `FormGroup` with all controls (season, club, team, encounter, event, captain, single1-4, double1-4, subtitudes)
- [ ] Implement `loadData()` — clear slots, fetch team via GraphQL, categorize players by REGULAR/BACKUP
- [ ] Implement ranking date calculation (with/without encounter)
- [ ] Implement saved assembly loading (logged-in, encounter selected only)
- [ ] Handle missing players in saved assemblies (fetch and add to REGULAR list)
- [ ] Implement player sorting logic (gender → sum → single tiebreak)
- [ ] Set dynamic slot labels based on team type (M/F/MX)
- [ ] Show loading indicator while data loads; hide assembly until ready

### Phase 3: Information Panels

- [ ] Implement "Basisspelers" panel → `p-card` or `p-fieldset` with base index + player list
- [ ] Implement "Titularissen" panel → same pattern with titular index + player list
- [ ] Implement "Fouten" panel → validation errors/warnings display
- [ ] Implement `AssemblyMessageComponent` — translates validation messages with interpolated params
- [ ] Display ranking format: `S - D (sum)` for M/F, `S - D - M (sum)` for MX
- [ ] Show level exception lock icon with tooltip
- [ ] Hide rankings on small containers (responsive resize detection)

### Phase 4: Player Pool (Left Column — Desktop)

- [ ] Implement captain selector → `p-autoComplete` with `p-floatLabel`
- [ ] Implement player list with `badman-assembly-player` cards (REGULAR players)
- [ ] Implement collapsible Reservespelers → `p-panel [toggleable]="true"` or `p-accordion`
- [ ] Implement "Voeg speler toe" → `p-autoComplete` with validation function (reject duplicates)
- [ ] Implement `addPlayer()` — fetch player info via GraphQL, add to REGULAR, re-sort
- [ ] Replace `mat-divider` → `p-divider`
- [ ] Replace all `mat-icon` → PrimeIcons (`pi pi-*`)
- [ ] Implement change team section with claims check (`badman-has-claim` equivalent)

### Phase 5: Game Slots (Right Column — Desktop)

- [ ] Create slot containers → `p-fieldset` with `legend` for each slot
- [ ] Set correct min-heights (70px double, 35px single)
- [ ] Implement ranking display logic per slot type (`showType` → single/double/mix ranking)
- [ ] Implement `TeamAssemblyPlayerComponent` with:
  - [ ] Competition status warning icon (when `competitionPlayer === false`)
  - [ ] Level exception lock icon
  - [ ] Dynamic ranking display based on `showType` and `eventType`
- [ ] Show substitute list separated by divider

### Phase 6: Desktop Drag-and-Drop

- [ ] Implement CDK drag from player pool to game slots (`cdkDrag`/`cdkDropList`)
- [ ] Implement `canDropPredicate` with all rules:
  - [ ] Capacity check (1 for single, 2 for double)
  - [ ] Substitute restriction (no players already in game slots)
  - [ ] Duplicate check (same player in same slot)
  - [ ] Gender restrictions for MX type
- [ ] Implement `drop()` handler:
  - [ ] Same container: reorder
  - [ ] From pool: copy (player stays in pool)
  - [ ] Between slots: transfer (player moves)
  - [ ] Back to pool: remove from slot
  - [ ] Auto-remove from substitutes when assigned to game slot
  - [ ] Single duplication check: cannot be in 2 single slots
  - [ ] Double duplication check: cannot be in 3+ double slots
- [ ] Connect all 10 drop lists to each other
- [ ] Set `[cdkDropListSortingDisabled]="true"` on all lists
- [ ] Trigger `updatedAssembly$` after every drop
- [ ] Style drag preview with shadow (`cdk-drag-preview` class)

### Phase 7: Mobile Select Fallback

- [ ] Add responsive breakpoint detection (`isMobile` signal, <=768px)
- [ ] On mobile: hide player pool column, show slots with `p-select` dropdowns
- [ ] Double slots: 2 selects; single slots: 1 select
- [ ] Substitute slot: multi-select or dynamic add/remove list
- [ ] Apply gender restrictions to select options (same rules as drop predicate)
- [ ] Apply single/double duplication rules to select options
- [ ] Ensure `availablePlayers` options update reactively (exclude already-assigned players)
- [ ] Stack layout vertically (filter bar → info panels → captain → slots → add player)
- [ ] Add `[showClear]="true"` on all mobile selects for easy removal
- [ ] Trigger validation on every select change

### Phase 8: Validation Integration

- [ ] Implement server-side validation via `validateAssembly` GraphQL query
- [ ] Wire up `updatedAssembly$` subject → validation pipeline
- [ ] Update form controls from slot arrays before validation
- [ ] Display validation results in Fouten panel (errors, warnings, success)
- [ ] Emit `validationOverview` output for parent page (download/save dialog integration)
- [ ] Implement validation confirmation dialog for download/save when not valid

### Phase 9: Download & Save

- [ ] Implement PDF download via `PdfService.getTeamAssembly()`
- [ ] Implement encounter name fetching for PDF filename
- [ ] Implement validation dialog before download/save (when invalid)
- [ ] Implement save mutation (`createAssembly`)
- [ ] Show success/error snackbar after save
- [ ] Refetch saved assemblies after save
- [ ] Loading states for both download and save buttons

### Phase 10: Polish

- [ ] Fix `substitudeList` → `substituteList` typo (keep `subtitudes` in GraphQL to match backend)
- [ ] Add empty state styling for slots (dashed border, placeholder text)
- [ ] Add loading states / skeletons (replace `mat-progress-bar`)
- [ ] Ensure dark theme compatibility
- [ ] Keyboard accessibility testing
- [ ] Verify deep-linking works end-to-end
- [ ] Test all three team types: M, F, MX
- [ ] Test saved assembly loading and restoration
- [ ] Test edge case: saved assembly references players no longer in team
- [ ] Verify all translation keys work
