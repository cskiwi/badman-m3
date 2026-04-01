# Team Builder Feature -- Implementation Plan

## Context

Club administrators need a tool to build teams for next season based on player survey responses (exported from a form to Excel). The feature lives as a new tab on the club detail page. It combines Excel import, drag-and-drop team composition, real-time index validation, and player performance flagging.

### Business Rules

- **Keep existing teams** with their ranking where possible
- **Promotion**: if a team promotes, reflect that in the new season
- **Min level tracking**: ensure a player can remain at the subevent level
- **Team index validation**: `teamIndex <= maxBaseIndex` from `CompetitionSubEvent`
  - M/F subevents: sum of (single + double) of the 4 highest-indexed (weakest) regular players
  - MX subevents: sum of (single + double + mix) of the 4 highest-indexed regular players
- **Low performance flagging**: players with poor results this season (competition games in that team) should be marked for review
- **New players** don't automatically get their preferred team -- admin must assign manually
- **Player comments** from the survey visible in a tooltip

### Architecture Decisions

- **Client-side Excel parsing** using `xlsx` (SheetJS) -- no backend upload infrastructure needed
- **Player matching** uses the existing search API (`GET /api/v1/search?query=<name>&types=players`) + GraphQL for full player data with rankings -- same pattern as `RankingBreakdownService.searchPlayers()`
- **Drag-and-drop** via `@angular/cdk/drag-drop` (already in dependencies) -- better cross-container support than PrimeNG DragDrop
- **State management** via Angular signals in a dedicated service
- **Save** via a new `saveTeamBuilder` GraphQL mutation that batch-creates/updates teams and memberships for next season

---

## Detailed Todolist

### Phase 1: Dependencies and Types

- [ ] **1.1** Install `xlsx` (SheetJS) package
  ```bash
  npm install xlsx
  ```

- [ ] **1.2** Create `SurveyResponse` interface
  - **New file**: `libs/frontend/pages/club/src/pages/detail/tabs/team-builder/types/survey-response.ts`
  - Map all Dutch column headers from Excel:
    - `externalId` <- "Id"
    - `fullName` <- "Full name"
    - `currentTeams` <- "In welke ploeg(en) speel je momenteel?" (parse as array)
    - `desiredTeamCount` <- "In hoeveel ploegen zou je willen spelen"
    - `preferredPlayDay` <- "Voorkeurs speeldag thuiswedstrijden"
    - `team1Choice1` <- "1e ploeg: 1e keuze"
    - `team1Choice2` <- "1e ploeg: 2e keuze"
    - `team2Choice1` <- "2e ploeg: 1e keuze"
    - `team2Choice2` <- "2e ploeg: 2e keuze"
    - `comments` <- "Zijn er eventuele andere opmerkingen..."
    - `canMeet75PercentTeam1` <- "Kan je deze 75% halen voor je 1e ploeg?"
    - `unavailabilityPeriodsTeam1` <- "Welke periode/momenten kan je niet spelen in je 1e ploeg?"
    - `canMeet75PercentTeam2` <- "Kan je deze 75% halen voor je 2e ploeg?"
    - `unavailabilityPeriodsTeam2` <- "Welke periode/momenten kan je niet spelen in je 2e ploeg?"
    - `meetingAttendance` <- "Aanwezigheid competitie vergadering..."
    - `availableDates` <- "Ik ben beschikbaar op volgende data:" (parse as array)
    - `linkedContactIds` <- "Linked contact IDs"
    - `matchedPlayerId?` -- resolved after matching

- [ ] **1.3** Create `TeamBuilderPlayer` and `TeamBuilderTeam` interfaces
  - **New file**: `libs/frontend/pages/club/src/pages/detail/tabs/team-builder/types/team-builder.types.ts`
  - `TeamBuilderPlayer`: id, fullName, firstName, lastName, gender, single, double, mix (from RankingLastPlace), survey (optional SurveyResponse), lowPerformance flag, encounterPresencePercent, isNewPlayer, assignedTeamId, membershipType
  - `TeamBuilderTeam`: id, name, type (M/F/MX), teamNumber, preferredDay, isNew, isPromoted, players[], teamIndex (computed), maxAllowedIndex (from CompetitionSubEvent.maxBaseIndex), minLevel, maxLevel, isValid, validationErrors[]

---

### Phase 2: Excel Import (Client-Side)

- [ ] **2.1** Create Excel parser service
  - **New file**: `libs/frontend/pages/club/src/pages/detail/tabs/team-builder/services/excel-parser.service.ts`
  - Injectable service
  - `parseFile(file: File): Promise<SurveyResponse[]>` method
  - Uses `xlsx.read()` with `type: 'array'` to parse workbook from ArrayBuffer
  - Takes first sheet, reads headers from row 1
  - Flexible column matching: trim whitespace, case-insensitive comparison
  - Parses multi-value fields (currentTeams split on comma/semicolon, availableDates)
  - Returns `SurveyResponse[]`

- [ ] **2.2** Create player matcher service using search API
  - **New file**: `libs/frontend/pages/club/src/pages/detail/tabs/team-builder/services/player-matcher.service.ts`
  - Injectable service, injects `HttpClient` and `Apollo`
  - `matchPlayers(responses: SurveyResponse[], systemId: string): Promise<MatchResult[]>` method
  - For each survey response:
    1. Call `GET /api/v1/search?query=<fullName>&types=players` (same as `RankingBreakdownService`)
    2. Take top result if score is high enough
    3. Fetch matched player details via GraphQL (id, fullName, rankingLastPlaces with single/double/mix)
  - Batch player IDs and fetch rankings in a single GraphQL call (same `PLAYERS_BY_IDS_QUERY` pattern)
  - Returns `MatchResult[]` with: surveyResponse, matchedPlayer (or null), confidence
  - Flags unmatched responses for manual resolution

- [ ] **2.3** Create import survey dialog component
  - **New file**: `libs/frontend/pages/club/src/components/team-builder/import-survey-dialog.component.ts`
  - **New file**: `libs/frontend/pages/club/src/components/team-builder/import-survey-dialog.component.html`
  - Opened via PrimeNG `DynamicDialog` (same pattern as `TeamEditComponent`)
  - UI sections:
    1. File input (`<input type="file" accept=".xlsx,.xls">`) with drag-drop zone
    2. Progress indicator during parsing and matching
    3. Results table showing: fullName, matched player (or "Not found"), confidence badge
    4. For unmatched rows: inline PrimeNG `AutoComplete` to search and manually pick a player
    5. Confirm button -> closes dialog and returns matched `SurveyResponse[]` to parent

---

### Phase 3: Team Index Calculation and Validation

- [ ] **3.1** Create team index calculator (pure functions)
  - **New file**: `libs/frontend/pages/club/src/pages/detail/tabs/team-builder/utils/team-index-calculator.ts`
  - `calculateTeamIndex(players: TeamBuilderPlayer[], teamType: 'M' | 'F' | 'MX'): number`
    - Filter to REGULAR members only
    - Sort by contribution descending (weakest = highest numbers first)
    - Take the 4 weakest players
    - M/F: sum of (single + double) per player
    - MX: sum of (single + double + mix) per player
  - `getPlayerContribution(player: TeamBuilderPlayer, teamType: string): number`
    - Helper returning single + double (or + mix for MX)

- [ ] **3.2** Create team validation function
  - Same file as 3.1
  - `validateTeam(team: TeamBuilderTeam): string[]` returning error messages
  - Checks:
    - `teamIndex <= maxAllowedIndex` (if maxAllowedIndex is set)
    - Minimum 4 regular players
    - Gender constraints: M teams = male players, F = female, MX = mixed
    - Min level: warn if any player's ranking level exceeds the subevent's maxLevel
    - Player can remain at level: check individual single/double/mix vs subevent constraints

- [ ] **3.3** Create performance flagging utility
  - **New file**: `libs/frontend/pages/club/src/pages/detail/tabs/team-builder/utils/performance-flags.ts`
  - `flagLowPerformance(player, teamEncounters): { lowPerformance: boolean, encounterPresencePercent: number }`
  - Uses current-season competition encounter data:
    - Count encounters where player was in the lineup vs total team encounters
    - Calculate presence percentage
    - Flag if presence < 50% or if win contribution is notably low
  - Data source: same `competitionEncounters` query used in `TeamCardService`

---

### Phase 4: Backend -- Save Mutation

- [ ] **4.1** Create GraphQL input types
  - **New file**: `libs/backend/graphql/src/inputs/team-builder.input.ts`
  - `TeamBuilderInput` (InputType):
    - `teamId?: string` (optional -- existing team ID to update)
    - `name: string`
    - `type: string` (M/F/MX)
    - `teamNumber?: number`
    - `preferredDay?: string`
    - `captainId?: string`
    - `players: TeamBuilderPlayerInput[]`
  - `TeamBuilderPlayerInput` (InputType):
    - `playerId: string`
    - `membershipType: string` (REGULAR/BACKUP)

- [ ] **4.2** Add `saveTeamBuilder` mutation to team resolver
  - **Modify**: `libs/backend/graphql/src/resolvers/team.resolver.ts`
  - New mutation: `saveTeamBuilder(clubId: ID!, season: Float!, teams: [TeamBuilderInput!]!): Boolean!`
  - Permission check: `edit-any:club` or `{clubId}_edit:club`
  - Logic for each team in input:
    1. If `teamId` provided: find existing team, update for next season (or clone if current-season team)
    2. If no `teamId`: create new Team entity with `season = nextSeason`, `clubId`
    3. Remove old `TeamPlayerMembership` records for that team+season
    4. Create new `TeamPlayerMembership` records from input players
  - Wrap in transaction for atomicity

- [ ] **4.3** Export new input types
  - **Modify**: `libs/backend/graphql/src/inputs/index.ts`
  - Add export for `team-builder.input`

---

### Phase 5: Frontend -- Team Builder Tab (Core)

- [ ] **5.1** Create team builder tab service
  - **New file**: `libs/frontend/pages/club/src/pages/detail/tabs/club-team-builder-tab.service.ts`
  - **Signals**:
    - `clubId: WritableSignal<string>`
    - `season: WritableSignal<number>` (current season)
    - `nextSeason: Signal<number>` = computed(() => season() + 1)
    - `surveyResponses: WritableSignal<SurveyResponse[]>`
    - `teams: WritableSignal<TeamBuilderTeam[]>` -- mutable builder state
    - `unassignedPlayers: Signal<TeamBuilderPlayer[]>` -- computed: all club players not assigned to any team
    - `validationSummary: Signal<{ valid: number, invalid: number, errors: string[] }>` -- computed
  - **Resources** (using `resource()` API):
    - `currentTeamsResource`: fetches club teams for current season with memberships, players, rankings
    - `nextSeasonTeamsResource`: fetches any existing next-season teams
    - `competitionSubEventsResource`: fetches sub-events with minBaseIndex/maxBaseIndex for current competition
    - `playerStatsResource`: fetches encounter data per player per team for performance flagging
  - **Methods**:
    - `importSurvey(file: File)`: opens import dialog, receives matched responses, updates signal
    - `initializeBuilder()`: clones current-season teams into builder state, applies survey data, flags performance
    - `movePlayer(playerId: string, fromTeamId: string | null, toTeamId: string | null)`: drag-drop handler, recalculates indexes
    - `setMembershipType(playerId: string, teamId: string, type: 'REGULAR' | 'BACKUP')`: toggle type
    - `addTeam(type: 'M' | 'F' | 'MX')`: create empty team in builder
    - `removeTeam(teamId: string)`: dissolve team, move players to pool
    - `promoteTeam(teamId: string)`: flag as promoted, shift level constraints
    - `save()`: call `saveTeamBuilder` mutation with current builder state

- [ ] **5.2** Create team builder tab component
  - **New file**: `libs/frontend/pages/club/src/pages/detail/tabs/club-team-builder-tab.component.ts`
  - **New file**: `libs/frontend/pages/club/src/pages/detail/tabs/club-team-builder-tab.component.html`
  - Standalone component, `ChangeDetectionStrategy.OnPush`
  - Inputs: `clubId: InputSignal<string>`, `season: InputSignal<number>`
  - Providers: `[ClubTeamBuilderTabService]`
  - **Template layout**:
    ```
    ┌─────────────────────────────────────────────────────┐
    │ Toolbar: [Import Excel] [Add Team ▼] [Save]  │ 3/5 valid │
    ├──────────────┬──────────────────────────────────────┤
    │ Player Pool  │  Team Cards (grid)                   │
    │              │  ┌──────┐ ┌──────┐ ┌──────┐         │
    │ - Search     │  │Team 1│ │Team 2│ │Team 3│         │
    │ - Filter     │  │      │ │      │ │      │         │
    │ - Unassigned │  │ drop │ │ drop │ │ drop │         │
    │   players    │  │ zone │ │ zone │ │ zone │         │
    │   (draggable)│  └──────┘ └──────┘ └──────┘         │
    └──────────────┴──────────────────────────────────────┘
    ```
  - Uses `@angular/cdk/drag-drop`: `cdkDropListGroup` on container, `cdkDropList` on pool and each team card, `cdkDrag` on each player chip

---

### Phase 6: Frontend -- UI Sub-Components

- [ ] **6.1** Create player chip component (draggable player representation)
  - **New file**: `libs/frontend/pages/club/src/components/team-builder/player-chip.component.ts`
  - **New file**: `libs/frontend/pages/club/src/components/team-builder/player-chip.component.html`
  - Inputs: `player: InputSignal<TeamBuilderPlayer>`
  - Display:
    - Name (bold)
    - Ranking level badges: `S:4 D:5 M:6` (using PrimeNG `Tag`)
    - Warning icon (`pi pi-exclamation-triangle`, orange) if `lowPerformance`
    - Star icon (`pi pi-star`, blue) if `isNewPlayer`
    - Membership type toggle (REGULAR/BACKUP) via small button
  - **Tooltip** (PrimeNG `TooltipModule`, `pTooltip`):
    - Survey preferences: team choices, preferred day, desired team count
    - **Comments** (from "Zijn er eventuele andere opmerkingen...")
    - Availability: 75% commitment, unavailability periods
    - Current teams
  - Has `cdkDrag` directive

- [ ] **6.2** Create builder team card component (droppable team column)
  - **New file**: `libs/frontend/pages/club/src/components/team-builder/builder-team-card.component.ts`
  - **New file**: `libs/frontend/pages/club/src/components/team-builder/builder-team-card.component.html`
  - Inputs: `team: InputSignal<TeamBuilderTeam>`
  - Outputs: `playerDropped`, `playerRemoved`, `promoteClicked`, `removeTeamClicked`
  - PrimeNG `Card` layout:
    - **Header**: team name + type badge (M/F/MX) + team number + preferred day
    - **Index bar**: `teamIndex / maxAllowedIndex` with color coding:
      - Green: index <= maxAllowedIndex
      - Orange: index is close (within 10%)
      - Red: index > maxAllowedIndex
    - **Promotion badge**: if `isPromoted`, show "Promoted" tag
    - **Player list**: `cdkDropList` containing player chips, ordered by contribution
    - **Footer**: validation error messages (red text), action buttons (promote, remove team)

---

### Phase 7: Wire Into Club Detail Page

- [ ] **7.1** Register the new tab
  - **Modify**: `libs/frontend/pages/club/src/pages/detail/page-detail.component.ts`
    - Add `ClubTeamBuilderTabComponent` to imports
    - Add `canAccessTeamBuilder()` method checking `edit-any:club` or `{clubId}_edit:club`
  - **Modify**: `libs/frontend/pages/club/src/pages/detail/page-detail.component.html`
    - Add tab value="4" with icon `pi pi-wrench` and label `{{ 'all.club.teamBuilder.tab' | translate }}`
    - Wrap in `@if (canAccessTeamBuilder())` for permission gating
    - Add tabpanel value="4" with `@defer (on idle)` containing `<app-club-team-builder-tab>`
  - **Modify**: `libs/frontend/pages/club/src/pages/detail/tabs/index.ts`
    - Export `ClubTeamBuilderTabComponent`

- [ ] **7.2** Add translation keys
  - Find existing i18n JSON files and add keys under `all.club.teamBuilder.*`:
    - `tab`: "Team Builder"
    - `importExcel`: "Import Survey"
    - `save`: "Save Teams"
    - `addTeam`: "Add Team"
    - `playerPool`: "Unassigned Players"
    - `validation.indexExceeded`: "Team index {{current}} exceeds max {{max}}"
    - `validation.notEnoughPlayers`: "Need at least 4 regular players"
    - `validation.valid`: "Valid"
    - `promotion.label`: "Promoted"
    - `performance.low`: "Low performance this season"
    - `player.new`: "New player"

---

### Phase 8: Edge Cases and Polish

- [ ] **8.1** Promotion handling
  - When admin flags a team as promoted, shift the target sub-event level
  - Update `maxAllowedIndex` constraint to match the new (higher) level's `maxBaseIndex`
  - Show a confirmation dialog explaining the constraint change

- [ ] **8.2** Existing next-season teams
  - If teams already exist for `season + 1`, load those as the starting state instead of cloning current season
  - This supports iterative building across multiple sessions
  - Show indicator: "Loaded from saved draft" vs "Cloned from current season"

- [ ] **8.3** New player handling
  - Players found in survey but not in any current-season team: `isNewPlayer = true`
  - Show with distinct blue star badge in player pool
  - Do NOT auto-assign to preferred team -- admin must drag manually
  - Survey tooltip still shows their preferences for reference

- [ ] **8.4** Min level tracking
  - Warn (orange badge on player chip) if assigning a player whose ranking level is too high/low for the subevent
  - Example: if subevent requires max level 8 and player is level 10, show warning
  - Don't block the assignment, just warn

- [ ] **8.5** Save confirmation
  - Before persisting, show a summary dialog:
    - Number of teams created/updated
    - Players moved between teams
    - Any unresolved validation errors (allow save anyway with confirmation)
  - After save, show success toast and refresh data

---

## File Summary

### New Files (approximately 15 files)

| # | File | Purpose |
|---|------|---------|
| 1 | `.../tabs/team-builder/types/survey-response.ts` | Excel survey data interface |
| 2 | `.../tabs/team-builder/types/team-builder.types.ts` | Builder state interfaces |
| 3 | `.../tabs/team-builder/services/excel-parser.service.ts` | Client-side xlsx parsing |
| 4 | `.../tabs/team-builder/services/player-matcher.service.ts` | Survey-to-player matching via search API |
| 5 | `.../tabs/team-builder/utils/team-index-calculator.ts` | Index calculation + team validation |
| 6 | `.../tabs/team-builder/utils/performance-flags.ts` | Low performance detection |
| 7 | `.../tabs/club-team-builder-tab.service.ts` | Tab state management service |
| 8 | `.../tabs/club-team-builder-tab.component.ts` | Tab component |
| 9 | `.../tabs/club-team-builder-tab.component.html` | Tab template |
| 10 | `.../components/team-builder/player-chip.component.ts` (+html) | Draggable player card with tooltip |
| 11 | `.../components/team-builder/builder-team-card.component.ts` (+html) | Droppable team column |
| 12 | `.../components/team-builder/import-survey-dialog.component.ts` (+html) | Excel import dialog |
| 13 | `libs/backend/graphql/src/inputs/team-builder.input.ts` | GraphQL input types for save |

### Modified Files (5 files)

| File | Change |
|------|--------|
| `package.json` | Add `xlsx` dependency |
| `.../pages/detail/page-detail.component.ts` | Import new tab, add permission check |
| `.../pages/detail/page-detail.component.html` | Add tab "4" for Team Builder |
| `.../pages/detail/tabs/index.ts` | Export new tab component |
| `libs/backend/graphql/src/resolvers/team.resolver.ts` | Add `saveTeamBuilder` mutation |
| `libs/backend/graphql/src/inputs/index.ts` | Export new input types |

### Existing Patterns to Reuse

| Pattern | Source | Reuse in |
|---------|--------|----------|
| Search API + GraphQL for player lookup | `RankingBreakdownService.searchPlayers()` | `player-matcher.service.ts` |
| Tab component with service + resource() | `ClubTeamsTabComponent` / `ClubTeamsTabService` | `club-team-builder-tab.*` |
| DynamicDialog pattern | `TeamEditComponent` | `import-survey-dialog.component.ts` |
| Competition encounter stats | `TeamCardService` | `performance-flags.ts` |
| Team sorting | `sortTeams` utility in teams tab | Builder team ordering |
| Permission checking | `PageDetailComponent.canEditTeam()` | `canAccessTeamBuilder()` |

---

## Verification

1. **Lint**: `npx nx run-many --target=lint` (affected projects)
2. **Build**: `npx nx run-many --target=build` (affected projects)
3. **Manual test flow**:
   - Navigate to club detail page
   - Verify Team Builder tab appears (only for users with edit permission)
   - Click "Import Survey" -> upload Excel -> verify parsed rows and player matching
   - Verify unassigned players appear in pool with ranking levels
   - Drag players between teams -> verify teamIndex recalculates in real-time
   - Verify validation errors appear when index exceeds max
   - Verify tooltip shows survey comments and preferences
   - Verify low-performance players have warning icon
   - Click "Save" -> confirm -> reload page -> verify teams persisted for next season
