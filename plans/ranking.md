---
title: Self-Calculating Ranking System (BVL / LFBB)
status: in-progress
---

## Progress

- [x] `queues/sync.queue.ts` — added `RANKING_CALC_QUEUE`, 4 job type constants, 4 job data interfaces, updated `ALL_SYNC_QUEUES` + `QUEUE_JOB_TYPE_MAP`
- [x] `processors/ranking-calc.processor.ts` — created, routes 4 job types to service methods
- [x] `processors/services/ranking-calc.service.ts` — created, all 4 job handlers implemented with TypeORM QueryBuilder queries
- [x] `services/sync.service.ts` — injected `rankingCalcQueue`, added `@Cron('0 3 * * *')`, `queueRankingCalc()`, scheduling helpers
- [x] `sync-processors.module.ts` — registered `RankingCalcProcessor`, `RankingCalcService`, `RANKING_CALC_QUEUE` flow producer
- [x] `processors/index.ts` — exported `RankingCalcProcessor`
- [x] `processors/services/index.ts` — exported `RankingCalcService`
- [x] Build passes (`nx run sync-worker:build` ✓)
- [x] Backend: `triggerRankingCalc` mutation added to `sync.resolver.ts`
- [x] Frontend service: `triggerRankingCalc` + `getRankingSystems` added to `SyncApiService`
- [x] Frontend: `RankingSystemsOverviewComponent` created — table with all systems, dialogs for triggering
- [x] Frontend: component wired into `SyncDashboardComponent` as a card at the top of the page
- [x] Build passes (`nx run sync-admin:build:production` ✓)

---

## Overview

Non-VISUAL ranking systems (BVL, LFBB) calculate rankings from game results already stored in
the database instead of importing them from an external API. The existing `ranking-sync` queue
(VISUAL only) is left untouched.

A new `ranking-calc` queue introduces four job types that form a parallel pipeline:

```
Daily Cron (3 AM)
  └─> for each non-VISUAL system with runCurrently=true that is due
        └─> RANKING_CALC_INIT  (per system)
              └─> RANKING_CALC_PERIOD  (per snapshot date — parallel across dates)
                    └─> RANKING_CALC_PLAYER_BATCH  (per ~100 players — parallel)
                          └─> RANKING_CALC_FINALIZE  (last batch triggers this)
```

---

## Scheduling Logic

The daily cron in `SyncService` (at `0 3 * * *`) iterates all `RankingSystem` records where
`runCurrently = true` and `rankingSystem != VISUAL`.

For each system it computes overdue snapshot dates:

```
cursor = calculationLastUpdate + calculationIntervalAmount/Unit
         snapped to calculationDayOfWeek

while cursor <= now:
  enqueue RANKING_CALC_INIT(systemId, calcDate=cursor, isUpdateDate)
  cursor += calculationIntervalAmount/Unit  (snap again)
```

`isUpdateDate` is true when:

- `cursor >= updateLastUpdate + updateIntervalAmount/Unit`
- AND `cursor.dayOfWeek === updateDayOfWeek` (if configured)

This catches up any missed dates by enqueueing all of them at once — they process in parallel.

---

## Queue and Job Types

**File:** `libs/backend/sync/src/lib/queues/sync.queue.ts`

### New queue name

```ts
export const RANKING_CALC_QUEUE = 'ranking-calc';
```

Add to `ALL_SYNC_QUEUES` and `QUEUE_JOB_TYPE_MAP`.

### New job type constants

```ts
RANKING_CALC_INIT:         'ranking-calc-init',
RANKING_CALC_PERIOD:       'ranking-calc-period',
RANKING_CALC_PLAYER_BATCH: 'ranking-calc-player-batch',
RANKING_CALC_FINALIZE:     'ranking-calc-finalize',
```

### Job data interfaces

```ts
export interface RankingCalcInitJobData {
  systemId: string;
  calcDate: string; // ISO — the snapshot date
  isUpdateDate: boolean; // true when level changes are allowed
  metadata?: JobDisplayMetadata;
}

export interface RankingCalcPeriodJobData {
  systemId: string;
  periodDate: string; // ISO — becomes RankingPlace.rankingDate
  windowStart: string; // ISO — periodDate - periodAmount/periodUnit
  windowEnd: string; // ISO — same as periodDate (exclusive upper bound)
  isUpdateDate: boolean;
  metadata?: JobDisplayMetadata;
}

export interface RankingCalcPlayerBatchJobData {
  systemId: string;
  periodDate: string;
  windowStart: string;
  windowEnd: string;
  playerIds: string[]; // IDs of players in this batch
  isUpdateDate: boolean;
  batchKey: string; // Redis key: ranking-calc:{systemId}:{periodDate}:remaining
  metadata?: JobDisplayMetadata;
}

export interface RankingCalcFinalizeJobData {
  systemId: string;
  calcDate: string;
  isUpdateDate: boolean;
  metadata?: JobDisplayMetadata;
}
```

---

## Job Logic

### RANKING_CALC_INIT

1. Load `RankingSystem` by `systemId`.
2. Compute `windowStart = calcDate - periodAmount/periodUnit`, `windowEnd = calcDate`.
3. Enqueue one `RANKING_CALC_PERIOD` job with those bounds.

For historical recomputation (manual trigger), this job can walk the full history by enqueuing
multiple `RANKING_CALC_PERIOD` jobs, one per snapshot date in range.

### RANKING*CALC_PERIOD *(lightweight orchestrator)\_

1. Load `RankingSystem`.
2. Query distinct `playerIds` that have `RankingPoint` records in the window AND belong to
   players with `competitionPlayer = true`:

   ```sql
   SELECT DISTINCT rp."playerId"
   FROM "RankingPoints" rp
   JOIN "Players" p ON p.id = rp."playerId"
   WHERE rp."systemId" = :systemId
     AND rp."rankingDate" >= :windowStart
     AND rp."rankingDate" < :windowEnd
     AND p."competitionPlayer" = true
   ```

3. Split player IDs into batches of ~100.
4. Store batch count in Redis (with 24 h TTL):

   ```
   SET ranking-calc:{systemId}:{periodDate}:remaining = totalBatches  EX 86400
   ```

5. Enqueue all `RANKING_CALC_PLAYER_BATCH` jobs simultaneously.

### RANKING*CALC_PLAYER_BATCH *(parallel, one per batch)\_

For each `playerId` in the batch:

1. **Aggregate points** — query `RankingPoint` joined to `Game` for `gameType` in the window
   for this player. Group by `gameType` (S→single, D→double, MX→mix). For each discipline,
   sort by `points DESC`, take top `latestXGamesToUse`, sum into `singlePoints` / `doublePoints`
   / `mixPoints`.

2. **Inactivity check** — count games per discipline in
   `[periodDate - inactivityAmount/inactivityUnit, periodDate]`. Flag discipline as inactive
   if count < `gamesForInactivty` (note: this is the exact field name in the model).

3. **Level determination** (only when `isUpdateDate`):
   - Load the player's most recent prior `RankingPlace` for this system to get current levels.
   - For each discipline:
     - `upThreshold   = system.pointsToGoUp[currentLevel - 2]` (threshold to move up)
     - `downThreshold = system.pointsToGoDown[currentLevel - 1]` (threshold to move down)
     - Apply `maxLevelUpPerChange` / `maxLevelDownPerChange` caps.
     - Apply `inactiveBehavior`: `'freeze'` = no movement, `'decrease'` = force level down.
   - Run `getRankingProtected()` to enforce `maxDiffLevels` constraint across disciplines.
   - When NOT `isUpdateDate`: carry forward prior levels unchanged (points-only snapshot).

4. **Upsert `RankingPlace`** — use the unique index `(playerId, systemId, rankingDate)`.
   Set `.id` on existing records so `@AfterUpdate` hooks fire (which maintain `RankingLastPlace`
   and `GamePlayerMembership` automatically). Bulk-upsert in chunks of 500.

5. **Coordination** — atomically `DECR ranking-calc:{systemId}:{periodDate}:remaining`.
   If the result is `0`, this is the last batch: enqueue `RANKING_CALC_FINALIZE`.

### RANKING_CALC_FINALIZE

1. Load all `RankingPlace` rows for `(systemId, calcDate)`.
2. For each discipline (`single`, `double`, `mix`):
   - Sort players by `{discipline}Points DESC`.
   - Assign `{discipline}Rank` = position (1-based, global).
   - Assign `total{Discipline}Ranking` = same as rank.
   - Group by level, sort within each group, assign `totalWithin{Discipline}Level`.
3. Bulk-save updated `RankingPlace` rows.
4. Update `system.calculationLastUpdate = calcDate`.
5. If `isUpdateDate`: update `system.updateLastUpdate = calcDate`.

---

## Files to Create

| File                                                                    | Purpose                                                                 |
| ----------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `libs/backend/sync/src/lib/processors/ranking-calc.processor.ts`        | Routes the 4 job types to service methods                               |
| `libs/backend/sync/src/lib/processors/services/ranking-calc.service.ts` | `processInit`, `processPeriod`, `processPlayerBatch`, `processFinalize` |

## Files to Modify

| File                                                          | Change                                                                                                                                                                           |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `libs/backend/sync/src/lib/queues/sync.queue.ts`              | New queue name, 4 job type constants, 4 job data interfaces, update `ALL_SYNC_QUEUES` + `QUEUE_JOB_TYPE_MAP`                                                                     |
| `libs/backend/sync/src/lib/services/sync.service.ts`          | Inject `rankingCalcQueue`, add `@Cron('0 3 * * *')` + `queueRankingCalc()` + `getNextSnapshotDates()` + `isUpdateDue()` helpers, add queue to `getAllQueues()` / `getQueueMap()` |
| `libs/backend/sync/src/lib/sync-processors.module.ts`         | Add `RankingCalcProcessor` + `RankingCalcService` to providers                                                                                                                   |
| `libs/backend/sync/src/lib/listeners/sync-events.listener.ts` | Add `RankingCalcEventsListener` for WebSocket progress events                                                                                                                    |
| `libs/backend/sync/src/lib/listeners/index.ts`                | Export new listener                                                                                                                                                              |
| `libs/backend/sync/src/lib/processors/index.ts`               | Export new processor                                                                                                                                                             |
| `libs/backend/sync/src/lib/processors/services/index.ts`      | Export new service                                                                                                                                                               |
| `libs/backend/sync/src/lib/sync.module.ts`                    | Add `RankingCalcEventsListener` to providers                                                                                                                                     |

---

## Implementation Notes

- **`RankingPoint` has no `gameType`** — requires a JOIN to `Games` table to determine discipline
- **`gamesForInactivty`** — this exact spelling (missing an 'i') is used in the `RankingSystem` model
- **Level arrays are 0-indexed, 1-based levels** — level 1 is the best; `pointsToGoUp[0]` is the
  threshold to reach level 1 from level 2
- **Redis counter** uses atomic `DECR` — no race conditions, works with any concurrency setting
- **`RankingPlace` hooks** fire on `@AfterInsert` / `@AfterUpdate` and maintain `RankingLastPlace`
  automatically; bulk upserts must set `.id` on existing records (same pattern as
  `processPublication` in `ranking-sync.service.ts`)
- **Worker concurrency** — set `concurrency` on the processor to control how many
  `RANKING_CALC_PLAYER_BATCH` jobs run simultaneously
- **VISUAL systems are unaffected** — `ranking-sync` queue and `RankingSyncProcessor` are
  unchanged

---

## UI: Manual Trigger & Overview (planned)

### Goal

- List **all** ranking systems (VISUAL and non-VISUAL) with their current status
- Allow manually triggering a calculation for non-VISUAL systems over a custom date range
- Show the VISUAL sync trigger alongside it for completeness

### Backend additions needed

**GraphQL mutation** on the existing `SyncResolver`:

```graphql
# Trigger self-calculation for a non-VISUAL ranking system
mutation QueueRankingCalc($systemId: ID!, $startDate: DateTime, $stopDate: DateTime): Boolean!

# Existing trigger — expose for symmetry
mutation QueueRankingSync($startDate: DateTime): Boolean!
```

**GraphQL query** to list all ranking systems with status:

```graphql
query RankingSystems {
  rankingSystems {
    id
    name
    rankingSystem       # BVL | LFBB | VISUAL | ORIGINAL
    runCurrently
    calculationLastUpdate
    updateLastUpdate
    calculationIntervalAmount
    calculationIntervalUnit
    updateIntervalAmount
    updateIntervalUnit
  }
}
```

**Files to add/modify (backend):**
- `libs/backend/graphql/src/lib/sync/sync.resolver.ts` — add `queueRankingCalc` mutation + expose existing `queueRankingSync`
- `libs/backend/graphql/src/lib/ranking/ranking-system.resolver.ts` — add `rankingSystems` query (or extend existing one)

### Frontend additions needed

**New component:** `apps/app/src/app/pages/admin/ranking-overview/ranking-overview.component.ts`

Layout:

```
┌─────────────────────────────────────────────────────┐
│ Ranking Systems                                      │
├────────────┬──────────┬───────────┬─────────────────┤
│ Name       │ Type     │ Last Calc │ Actions         │
├────────────┼──────────┼───────────┼─────────────────┤
│ BBF Rating │ VISUAL   │ 2026-03-24│ [Sync now]      │
│ BVL        │ BVL      │ 2026-03-17│ [Calculate ▾]   │
│ LFBB       │ LFBB     │ 2026-03-10│ [Calculate ▾]   │
└────────────┴──────────┴───────────┴─────────────────┘
```

- **VISUAL row** → "Sync now" button calls `queueRankingSync`
- **Non-VISUAL row** → "Calculate" opens a date-range picker dialog, submits `queueRankingCalc(systemId, startDate, stopDate)`
- Status badge: green (up to date), amber (overdue), grey (inactive)

**Files to create/modify (frontend):**
- `apps/app/src/app/pages/admin/ranking-overview/` — new component
- `apps/app/src/app/pages/admin/admin.routes.ts` — add route `/admin/ranking`
