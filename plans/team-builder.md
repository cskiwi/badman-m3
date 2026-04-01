# Team Builder Feature -- Implementation Plan

## Context

Club administrators need a tool to build teams for next season based on player survey responses (exported from a form to Excel). The feature lives as a new tab on the club detail page. It combines Excel import, drag-and-drop team composition, real-time index validation, and player performance flagging.

### Business Rules

- **Keep existing teams** with their ranking where possible
- **Promotion**: if a team promotes, reflect that in the new season
- **Min level tracking**: ensure a player can remain at the subevent level
- **Ranking display**: M/F doubles team cards show only single + double rankings; MX cards also show mixed ranking
- **Team index validation**: `teamIndex <= maxBaseIndex` from `CompetitionSubEvent`
  - M/F subevents: sum of (single + double) of the 4 highest-indexed (weakest) regular players
  - MX subevents: sum of (single + double + mix) of the 4 highest-indexed regular players
- **Low performance flagging**: players with poor results this season (competition games in that team) should be marked for review
- **New players** don't automatically get their preferred team -- admin must assign manually
- **Player comments** from the survey visible in a tooltip

### Architecture Decisions

- **Client-side Excel parsing** using `xlsx` (SheetJS) -- no backend upload infrastructure needed
- **Player matching** first checks all active players linked to the club locally, including normalized `memberId` fallback matching via survey identifiers, then falls back to the global search API (`GET /api/v1/search?query=<name>&types=players`) + GraphQL for full player data with rankings. Manual search in the dialog also prioritizes club players before global results (same autocomplete pattern as `list-games.component.html`)
- **Drag-and-drop** via `@angular/cdk/drag-drop` (already in dependencies) -- better cross-container support than PrimeNG DragDrop
- **State management** via Angular signals in a dedicated service
- **Save** via a new `saveTeamBuilder` GraphQL mutation that batch-creates/updates teams and memberships for next season

---

## Detailed Todolist

### Phase 1: Dependencies and Types

- [x] **1.1** Install `xlsx` (SheetJS) package

- [x] **1.2** Create `SurveyResponse` interface
  - `libs/frontend/pages/club/src/pages/detail/tabs/team-builder/types/survey-response.ts`

- [x] **1.3** Create `TeamBuilderPlayer` and `TeamBuilderTeam` interfaces
  - `libs/frontend/pages/club/src/pages/detail/tabs/team-builder/types/team-builder.types.ts`

---

### Phase 2: Excel Import (Client-Side)

- [x] **2.1** Create Excel parser service
  - `libs/frontend/pages/club/src/pages/detail/tabs/team-builder/services/excel-parser.service.ts`

- [x] **2.2** Create player matcher service with club-first matching
  - `libs/frontend/pages/club/src/pages/detail/tabs/team-builder/services/player-matcher.service.ts`
  - `matchPlayers()` first checks all active club players locally, then tries normalized `memberId` matches from `externalId` and `linkedContactIds`, then falls back to global search API for unmatched
  - `searchPlayerByName()` returns club player matches first, then appends global API results (deduplicated)
  - `MatchResult` includes `createNew` flag for unmatched players to be created in the database

- [x] **2.3** Create import survey dialog component with inline player search
  - `libs/frontend/pages/club/src/components/team-builder/import-survey-dialog.component.ts`
  - `libs/frontend/pages/club/src/components/team-builder/import-survey-dialog.component.html`
  - Receives `clubPlayers` and `clubId` via dialog config data for local-first matching
  - Uses `p-autoComplete` (same pattern as ranking breakdown list-games) for manual player search
  - Matched players can be overridden via edit button that shows the autocomplete
  - Unmatched players can be marked as "Create New" — will create a new Player record in the database
  - Returns full `MatchResult[]` (instead of just surveys) to support create-new flow

---

### Phase 3: Team Index Calculation and Validation

- [x] **3.1** Create team index calculator (pure functions)
  - `libs/frontend/pages/club/src/pages/detail/tabs/team-builder/utils/team-index-calculator.ts`

- [x] **3.2** Create team validation function (same file as 3.1)

- [x] **3.3** Create performance flagging utility
  - `libs/frontend/pages/club/src/pages/detail/tabs/team-builder/utils/performance-flags.ts`

---

### Phase 4: Backend -- Save Mutation & Player Creation

- [x] **4.1** Create GraphQL input types
  - `libs/backend/graphql/src/inputs/team-builder.input.ts`
  - Added `CreatePlayerForTeamBuilderInput` (firstName, lastName, gender) for creating new players

- [x] **4.2** Add `saveTeamBuilder` mutation to team resolver
  - Modified: `libs/backend/graphql/src/resolvers/team.resolver.ts`

- [x] **4.3** Add `createPlayersForTeamBuilder` mutation to team resolver
  - Creates `Player` records with `competitionPlayer: true`
  - Creates `ClubPlayerMembership` (type NORMAL) linking new player to the club
  - Generates unique slug for each player
  - Returns created players with IDs for frontend use

- [x] **4.4** Export new input types
  - Modified: `libs/backend/graphql/src/inputs/index.ts`

---

### Phase 5: Frontend -- Team Builder Tab (Core)

- [x] **5.1** Create team builder tab service
  - `libs/frontend/pages/club/src/pages/detail/tabs/club-team-builder-tab.service.ts`
  - `processImportResults()` handles both matched and create-new results: calls `createPlayersForTeamBuilder` mutation for unmatched entries, caches the matched GraphQL player payloads for non-team players, then applies all survey data via `applySurveyData()`

- [x] **5.2** Create team builder tab component
  - `libs/frontend/pages/club/src/pages/detail/tabs/club-team-builder-tab.component.ts`
  - `libs/frontend/pages/club/src/pages/detail/tabs/club-team-builder-tab.component.html`

---

### Phase 6: Frontend -- UI Sub-Components

- [x] **6.1** Create player chip component
  - `libs/frontend/pages/club/src/components/team-builder/player-chip.component.ts`
  - `libs/frontend/pages/club/src/components/team-builder/player-chip.component.html`

- [x] **6.2** Create builder team card component
  - `libs/frontend/pages/club/src/components/team-builder/builder-team-card.component.ts`
  - `libs/frontend/pages/club/src/components/team-builder/builder-team-card.component.html`

---

### Phase 7: Wire Into Club Detail Page

- [x] **7.1** Register the new tab
  - Modified: `libs/frontend/pages/club/src/pages/detail/page-detail.component.ts`
  - Modified: `libs/frontend/pages/club/src/pages/detail/page-detail.component.html`
  - Modified: `libs/frontend/pages/club/src/pages/detail/tabs/index.ts`

- [x] **7.2** Add translation keys (EN, NL, FR)
  - Modified: `libs/backend/translate/assets/i18n/en/all.json`
  - Modified: `libs/backend/translate/assets/i18n/nl_BE/all.json`
  - Modified: `libs/backend/translate/assets/i18n/fr_BE/all.json`

---

### Phase 8: Edge Cases and Polish

- [x] **8.1** Standing-based promotion/demotion and sub-event assignment
  - Team builder now loads each entry's `standing`, `competitionDraw`, and `competitionSubEvents` so sub-event selection can be derived from the actual competition data
  - Default next-season sub-event is determined from standing position plus draw `risers`/`fallers`
  - Teams that neither rise nor fall auto-check whether their team index still fits the selected sub-event's `minBaseIndex`/`maxBaseIndex` range and switch to the matching sub-event when needed
  - Team cards show the selected sub-event details below the team index and allow manual override back to `Auto` or to a specific sub-event

- [x] **8.2** Existing next-season teams
  - `nextSeasonResource` checks for existing teams in `season + 1`
  - `initializeBuilder()` loads draft if available, otherwise clones current season
  - Shows "Loaded from saved draft" indicator via `loadedFromDraft()` signal

- [x] **8.3** New player handling
  - `getCurrentSeasonPlayerIds()` identifies players not in any current team
  - Survey-matched players not in current teams added to pool with `isNewPlayer: true`
  - Blue star badge in player chip, no auto-assignment

- [x] **8.4** Min level tracking
  - `recalculateTeam()` sets per-player `levelWarning` for too-strong or too-weak players
  - Orange ban icon in player chip with tooltip explaining the warning

- [x] **8.5** Save confirmation
  - `getSaveSummary()` returns teamsCreated, teamsUpdated, totalPlayers, warnings
  - Confirmation dialog shows full summary with validation warnings before persisting
  - Success/error toast after save

- [x] **8.6** Pass active ranking system ID to import dialog
  - Injected `RankingSystemService`, exposed `systemId` computed signal
  - Passed to import dialog via `data: { systemId: this.service.systemId() }`

- [x] **8.7** Players stopping competition
  - Added `stoppingCompetition` boolean to `SurveyResponse`, detected from "Ik stop met competitie" in `desiredTeamCount` raw value
  - Added `isStopping` flag to `TeamBuilderPlayer`
  - Added `stoppingPlayers` signal in service, excluded from unassigned pool
  - "Players Stopping" drop zone below player pool with red-themed border
  - `applySurveyData()` auto-moves players with "Ik stop met competitie" survey response to stopping pool
  - Players can be dragged between pool, teams, and stopping zone freely
  - Red times-circle icon on stopping players in player chip
  - Translation keys added for EN, NL, FR

- [x] **8.8** Mark team for removal with auto-renumbering
  - Added `isMarkedForRemoval` boolean to `TeamBuilderTeam` interface
  - `markTeamForRemoval(teamId)` toggles the flag, moves players to unassigned pool
  - `renumberTeams()` renumbers remaining active teams of the same type (e.g., removing M 2 makes M 3 become M 2)
  - Builder team card shows ban/undo button on all teams, "Removing" tag, strikethrough name, opacity when marked
  - Drop zone hidden for marked teams, replaced with removal message
  - Marked teams excluded from `save()`, `validationSummary()`, and `getSaveSummary()`
  - Save confirmation shows count of teams being removed

- [x] **8.9** Team naming based on club model
  - Query now fetches `teamName`, `fullName`, `abbreviation`, `useForTeamName` from the club
  - `clubTeamBaseName` computed signal resolves the correct name based on `UseForTeamName` enum
  - `buildTeamName(type, number)` generates names like "BC Lede 2M" instead of "M 2"
  - Used in `addTeam()` and `renumberTeams()` for consistent naming

- [x] **8.10** Desired team count validation
  - Added `teamCountWarning?: string` to `TeamBuilderPlayer` interface
  - `unassignedPlayers` computed now shows players N times in pool based on `desiredTeamCount - currentTeamCount`
    - Player wants 2 teams → 2 entries in pool; assigned to 1 team → 1 entry remains
    - Player wants 1 team → 1 entry; once assigned → removed from pool
    - Players without survey default to 1 slot (original behavior preserved)
  - `updateTeamCountWarnings()` sets warning on assigned players when in more teams than desired
  - `movePlayer()` guards against adding a player to a team they're already in
  - `validationSummary` includes cross-team warnings for over-assigned players
  - Orange users icon in player chip with tooltip showing the mismatch
  - Pool template uses `track $index` to support duplicate player entries

- [x] **8.11** Add/remove players from builder
  - **Remove drop zone**: drag any player (from pool, team, or stopping) onto trash zone to remove entirely
    - `removePlayer(playerId)` removes from teams, stopping, manually added; tracks in `removedPlayerIds` signal
    - `unassignedPlayers` excludes removed player IDs
    - Removed players shown in a restore list with undo button
    - `restorePlayer(playerId)` re-adds to pool
  - **Add player autocomplete**: search for any player (club-first, then global API) and add to pool
    - `searchPlayers(query)` in service uses HTTP search API, same pattern as import dialog
    - `addExternalPlayer(playerBasic)` fetches rankings via GraphQL, creates `TeamBuilderPlayer`, adds to `manuallyAddedPlayers` signal
    - If player was previously removed, `addExternalPlayer` auto-restores instead
    - Duplicate detection prevents adding an already-present player
  - Translation keys added for EN, NL, FR: `addPlayer`, `removePlayer`, `dropToRemove`, `removedPlayers`

- [x] **8.12** Create new players for unmatched survey entries
  - Unmatched survey entries in the import dialog now have a "Create New" button instead of being silently dropped
  - Admin can toggle "Create New" on/off per unmatched entry
  - On confirm, `processImportResults()` calls `createPlayersForTeamBuilder` GraphQL mutation to create `Player` records in the database
  - Each created player gets a `ClubPlayerMembership` linking them to the club
  - Created players are automatically matched back to their survey entries and included in `applySurveyData()`
  - Import summary shows count of matched + newly created players
  - Translation keys added for EN, NL, FR: `toCreate`, `createNew`, `willCreate`, `total`

- [x] **8.13** Match club-only survey players before treating them as new
  - Team builder data now loads all active club players for import matching, not only players in the current season teams
  - Member ID matching normalizes `externalId`, `linkedContactIds`, and `player.memberId` to survive punctuation and special-character differences
  - Survey-matched players outside the current season teams retain their GraphQL `rankingLastPlaces` when they are added to the builder pool

- [x] **8.14** Resolve club memberships on `Club` for team-builder import
  - Added `Club.clubPlayerMemberships` resolver support in GraphQL so the team builder can load local club players from the single-club query without null-field runtime errors

- [x] **8.15** Fix `Club.clubPlayerMemberships` schema metadata
  - Corrected the `Club` model field to expose `clubPlayerMemberships` as a list and fixed the TypeORM inverse relation to `membership.club`, preventing GraphQL from treating an array result as a single `ClubPlayerMembership`

- [x] **8.16** Tighten internal name matching around initials
  - Local club matching now prefers an exact full-name hit before fuzzy matching
  - Fuzzy matching ignores one-letter initials as substring matches, preventing names like `Franky R. Mercy` from falsely matching unrelated names that merely contain the letter `r`
  - Added a regression spec covering the Franky/Mirko/Karam mismatch case and the intended `Franky Mercy` → `Franky R. Mercy` local match

- [x] **8.17** Contextual ranking display for doubles teams
  - `app-player-chip` now supports hiding the mixed ranking
  - Builder team cards show only single and double rankings for M/F doubles teams
  - MX teams and player pool cards continue to show single, double, and mixed rankings

- [x] **8.18** Gender split display for mixed (MX) teams
  - MX team cards now visually separate males and females with labeled sections
  - Each section shows a gender icon (♂/♀) and count (e.g. "Males (3)", "Females (2)")
  - Regulars and backups each have their own male/female subsections
  - M/F team cards remain unchanged (flat list)
  - `sortedPlayers` computed extended with `regularMales`, `regularFemales`, `backupMales`, `backupFemales` arrays

- [x] **8.19** Player info popover replacing tooltip
  - Replaced plain-text `pTooltip` on player chip with a PrimeNG `Popover` component
  - Hovering a player chip opens a rich popover showing:
    - Player name and full ranking (single - double - mix)
    - All warnings/errors: stopping, low performance, new player, level warning, team count warning
    - Survey remarks always visible (even for stopping players)
    - Full survey data: teams wanted, preferred day, team preferences, availability, unavailability
  - Falls back to "No survey data available" when no survey or warnings exist
  - Status icons (warning, star, etc.) remain on the chip for at-a-glance visibility
  - Removed old `tooltipContent` getter and `[pTooltip]` binding from chip container

- [x] **8.20** Edit survey dialog on player double-click
  - Double-clicking a player chip (in pool, teams, or stopping zone) opens a PrimeNG DynamicDialog
  - Dialog allows editing all survey fields: teams wanted, preferred day, team preferences (1st/2nd choice for teams 1&2), 75% availability, unavailability periods, comments, and stopping competition flag
  - Pre-populates existing survey data or shows empty form for players without survey
  - On save, `updatePlayerSurvey()` in the service propagates changes across all locations (teams, stopping, manually added)
  - If "stopping competition" is toggled in the dialog, player is automatically moved to/from the stopping pool
  - `EditSurveyDialogComponent` created at `components/team-builder/edit-survey-dialog.component.ts` (+html)
  - `playerClicked` output added to `PlayerChipComponent` and `BuilderTeamCardComponent`
  - Popover only shows 75% availability when the answer is negative (Nee/No), styled in red

- [x] **8.21** Fix Excel import missing survey fields
  - Root cause: `sheet_to_json` without `defval` omitted keys for empty cells, so `Object.keys(rawRows[0])` only returned headers where the first data row had values — any column empty in the first row was never discovered for any player
  - Fix: added `defval: ''` to `sheet_to_json` options so all columns produce keys in every row
  - Reverted `COLUMN_MAP` to exact header patterns from the actual survey Excel (no variations)
  - Reverted header matching from `includes` back to `startsWith` to prevent false positives (e.g., `'id'` matching inside `'aanwezigheid'`)

---

## File Summary

### New Files Created (15 files)

| #   | File                                                                    | Purpose                                  |
| --- | ----------------------------------------------------------------------- | ---------------------------------------- |
| 1   | `.../tabs/team-builder/types/survey-response.ts`                        | Excel survey data interface              |
| 2   | `.../tabs/team-builder/types/team-builder.types.ts`                     | Builder state interfaces                 |
| 3   | `.../tabs/team-builder/services/excel-parser.service.ts`                | Client-side xlsx parsing                 |
| 4   | `.../tabs/team-builder/services/player-matcher.service.ts`              | Survey-to-player matching via search API |
| 5   | `.../tabs/team-builder/utils/team-index-calculator.ts`                  | Index calculation + team validation      |
| 6   | `.../tabs/team-builder/utils/performance-flags.ts`                      | Low performance detection                |
| 7   | `.../tabs/club-team-builder-tab.service.ts`                             | Tab state management service             |
| 8   | `.../tabs/club-team-builder-tab.component.ts`                           | Tab component                            |
| 9   | `.../tabs/club-team-builder-tab.component.html`                         | Tab template                             |
| 10  | `.../components/team-builder/player-chip.component.ts` (+html)          | Draggable player card with tooltip       |
| 11  | `.../components/team-builder/builder-team-card.component.ts` (+html)    | Droppable team column                    |
| 12  | `.../components/team-builder/import-survey-dialog.component.ts` (+html) | Excel import dialog                      |
| 13  | `libs/backend/graphql/src/inputs/team-builder.input.ts`                 | GraphQL input types for save             |

### Modified Files (8 files)

| File                                                  | Change                               |
| ----------------------------------------------------- | ------------------------------------ |
| `package.json`                                        | Add `xlsx` dependency                |
| `.../pages/detail/page-detail.component.ts`           | Import new tab, add permission check |
| `.../pages/detail/page-detail.component.html`         | Add tab "4" for Team Builder         |
| `.../pages/detail/tabs/index.ts`                      | Export new tab component             |
| `libs/backend/graphql/src/resolvers/team.resolver.ts` | Add `saveTeamBuilder` mutation       |
| `libs/backend/graphql/src/inputs/index.ts`            | Export new input types               |
| `libs/backend/translate/assets/i18n/en/all.json`      | EN translation keys                  |
| `libs/backend/translate/assets/i18n/nl_BE/all.json`   | NL translation keys                  |
| `libs/backend/translate/assets/i18n/fr_BE/all.json`   | FR translation keys                  |

---

## Verification

1. **Type check**: `npx tsc --noEmit` on both frontend and backend -- **PASSED**
2. **Lint**: Pre-existing errors only, no new lint errors from team builder code
3. **Manual test flow**:
   - Navigate to club detail page
   - Verify Team Builder tab appears (only for users with edit permission)
   - Click "Import Survey" -> upload Excel -> verify parsed rows and player matching
  - Verify a club member without a current-team assignment is matched locally and shows the latest ranking in the pool
   - Verify unassigned players appear in pool with ranking levels
   - Drag players between teams -> verify teamIndex recalculates in real-time
   - Verify validation errors appear when index exceeds max
   - Verify tooltip shows survey comments and preferences
   - Verify low-performance players have warning icon
   - Click "Save" -> confirm -> reload page -> verify teams persisted for next season
