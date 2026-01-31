# Tournament Enrollment Schema Design

## Executive Summary

This document outlines the database schema design and migration strategy for implementing a general enrollment page that supports:
- Per-sub-event enrollment control (independent of tournament phase)
- Multi-discipline selection in a single transaction
- Flexible scheduling with per-event enrollment windows
- Enhanced waiting list management with automatic promotion
- Full backward compatibility with existing `TournamentEnrollments` table

## 1. Current State Analysis

### Existing Tables

#### `TournamentEvent` (event.EventTournaments)
```typescript
- id: uuid (PK)
- phase: TournamentPhase (ENUM) ← Current enrollment control
- enrollmentOpenDate: timestamptz
- enrollmentCloseDate: timestamptz
- allowGuestEnrollments: boolean
- clubId: uuid (FK)
```

**Issue**: Single tournament-level `phase` controls all sub-events, preventing independent enrollment windows.

#### `TournamentSubEvent` (event.SubEventTournaments)
```typescript
- id: uuid (PK)
- eventId: uuid (FK → TournamentEvent)
- eventType: SubEventTypeEnum (MEN, WOMEN, MIXED)
- gameType: GameType (SINGLES, DOUBLES, MIXED)
- maxEntries: integer
- waitingListEnabled: boolean
- minLevel: integer
- maxLevel: integer
```

**Limitation**: No per-event enrollment dates or phase control.

#### `TournamentEnrollment` (event.TournamentEnrollments)
```typescript
- id: uuid (PK)
- tournamentSubEventId: uuid (FK → TournamentSubEvent)
- playerId: uuid (FK → Player)
- status: EnrollmentStatus (PENDING, CONFIRMED, WAITING_LIST, CANCELLED, WITHDRAWN)
- preferredPartnerId: uuid (FK → Player)
- confirmedPartnerId: uuid (FK → Player)
- isGuest: boolean
- guestName, guestEmail, guestPhone: varchar
- waitingListPosition: integer
- notes: text
- UNIQUE INDEX: (tournamentSubEventId, playerId)
```

## 2. Proposed Schema Changes

### 2.1 Enhanced `TournamentSubEvent` Table

Add per-sub-event enrollment control fields:

```sql
ALTER TABLE event."SubEventTournaments" ADD COLUMN
  -- Per-event enrollment windows
  "enrollmentOpenDate" timestamptz,
  "enrollmentCloseDate" timestamptz,

  -- Per-event enrollment state
  "enrollmentPhase" varchar(50) DEFAULT 'DRAFT',

  -- Capacity management
  "currentEnrollmentCount" integer DEFAULT 0,
  "confirmedEnrollmentCount" integer DEFAULT 0,

  -- Waiting list management
  "autoPromoteFromWaitingList" boolean DEFAULT true,
  "maxWaitingListSize" integer,

  -- Enrollment restrictions
  "requiresApproval" boolean DEFAULT false,
  "allowGuestEnrollments" boolean DEFAULT true,
  "enrollmentNotes" text;
```

**New Enum: `SubEventEnrollmentPhase`**
```typescript
export enum SubEventEnrollmentPhase {
  DRAFT = 'DRAFT',                    // Not yet open
  OPEN = 'OPEN',                      // Accepting enrollments
  CLOSED = 'CLOSED',                  // No new enrollments
  WAITLIST_ONLY = 'WAITLIST_ONLY',    // Only accepting waiting list
  FULL = 'FULL',                      // Max capacity reached
  LOCKED = 'LOCKED'                   // Draws made, no changes
}
```

### 2.2 New `EnrollmentSession` Table (Optional Cart)

Supports multi-event enrollment in a single transaction:

```sql
CREATE TABLE event."EnrollmentSessions" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),

  -- Session identification
  "sessionKey" varchar(255) UNIQUE NOT NULL,
  "playerId" uuid REFERENCES personal."Players"("id") ON DELETE CASCADE,

  -- Session state
  "status" varchar(50) NOT NULL DEFAULT 'PENDING',
  "expiresAt" timestamptz NOT NULL,

  -- Metadata
  "ipAddress" varchar(45),
  "userAgent" text,

  -- Computed fields
  "totalSubEvents" integer DEFAULT 0,
  "completedAt" timestamptz
);

CREATE INDEX "IDX_enrollment_sessions_player" ON event."EnrollmentSessions"("playerId");
CREATE INDEX "IDX_enrollment_sessions_status" ON event."EnrollmentSessions"("status");
CREATE INDEX "IDX_enrollment_sessions_expires" ON event."EnrollmentSessions"("expiresAt");
```

**Session Status Enum:**
```typescript
export enum EnrollmentSessionStatus {
  PENDING = 'PENDING',        // In progress
  COMPLETED = 'COMPLETED',    // Successfully submitted
  EXPIRED = 'EXPIRED',        // Timed out
  CANCELLED = 'CANCELLED'     // User cancelled
}
```

### 2.3 New `EnrollmentSessionItem` Table

Tracks individual sub-event selections within a session:

```sql
CREATE TABLE event."EnrollmentSessionItems" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),

  -- Relationships
  "sessionId" uuid NOT NULL REFERENCES event."EnrollmentSessions"("id") ON DELETE CASCADE,
  "tournamentSubEventId" uuid NOT NULL REFERENCES event."SubEventTournaments"("id") ON DELETE CASCADE,

  -- Doubles partner info (captured at cart time)
  "preferredPartnerId" uuid REFERENCES personal."Players"("id") ON DELETE SET NULL,

  -- Guest enrollment info
  "isGuestEnrollment" boolean DEFAULT false,
  "guestName" varchar(255),
  "guestEmail" varchar(255),
  "guestPhone" varchar(50),

  -- Validation state
  "validationStatus" varchar(50) DEFAULT 'PENDING',
  "validationErrors" jsonb,

  -- Notes
  "notes" text,

  CONSTRAINT "UQ_session_subevent" UNIQUE ("sessionId", "tournamentSubEventId")
);

CREATE INDEX "IDX_session_items_session" ON event."EnrollmentSessionItems"("sessionId");
CREATE INDEX "IDX_session_items_subevent" ON event."EnrollmentSessionItems"("tournamentSubEventId");
```

**Validation Status Enum:**
```typescript
export enum ItemValidationStatus {
  PENDING = 'PENDING',            // Not yet validated
  VALID = 'VALID',                // Passed validation
  INVALID_CAPACITY = 'INVALID_CAPACITY',  // Event full
  INVALID_LEVEL = 'INVALID_LEVEL',        // Level restrictions
  INVALID_PARTNER = 'INVALID_PARTNER',    // Partner issues
  INVALID_SCHEDULE = 'INVALID_SCHEDULE'   // Timing conflicts
}
```

### 2.4 Enhanced `TournamentEnrollment` Table

Add fields for better tracking and automation:

```sql
ALTER TABLE event."TournamentEnrollments" ADD COLUMN
  -- Source tracking
  "sessionId" uuid REFERENCES event."EnrollmentSessions"("id") ON DELETE SET NULL,
  "enrollmentSource" varchar(50) DEFAULT 'MANUAL',

  -- Waiting list automation
  "promotedAt" timestamptz,
  "promotedFromWaitingList" boolean DEFAULT false,
  "originalWaitingListPosition" integer,

  -- Approval workflow
  "requiresApproval" boolean DEFAULT false,
  "approvedBy" uuid REFERENCES personal."Players"("id") ON DELETE SET NULL,
  "approvedAt" timestamptz,
  "rejectionReason" text,

  -- Timestamps for analytics
  "confirmedAt" timestamptz,
  "cancelledAt" timestamptz,
  "withdrawnAt" timestamptz;
```

**Enrollment Source Enum:**
```typescript
export enum EnrollmentSource {
  MANUAL = 'MANUAL',              // Created by admin
  PUBLIC_FORM = 'PUBLIC_FORM',    // General enrollment page
  IMPORT = 'IMPORT',              // Bulk import
  AUTO_PROMOTED = 'AUTO_PROMOTED' // From waiting list
}
```

### 2.5 New `WaitingListLog` Table

Track waiting list movements for transparency:

```sql
CREATE TABLE event."WaitingListLogs" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "createdAt" timestamptz NOT NULL DEFAULT now(),

  -- Relationships
  "enrollmentId" uuid NOT NULL REFERENCES event."TournamentEnrollments"("id") ON DELETE CASCADE,
  "tournamentSubEventId" uuid NOT NULL REFERENCES event."SubEventTournaments"("id") ON DELETE CASCADE,

  -- Change tracking
  "action" varchar(50) NOT NULL,
  "previousPosition" integer,
  "newPosition" integer,

  -- Metadata
  "triggeredBy" varchar(50),
  "notes" text
);

CREATE INDEX "IDX_waitlist_log_enrollment" ON event."WaitingListLogs"("enrollmentId");
CREATE INDEX "IDX_waitlist_log_subevent" ON event."WaitingListLogs"("tournamentSubEventId");
CREATE INDEX "IDX_waitlist_log_created" ON event."WaitingListLogs"("createdAt");
```

**Waiting List Action Enum:**
```typescript
export enum WaitingListAction {
  ADDED = 'ADDED',                // Joined waiting list
  PROMOTED = 'PROMOTED',          // Moved to confirmed
  POSITION_CHANGED = 'POSITION_CHANGED',  // Position updated
  REMOVED = 'REMOVED'             // Left waiting list
}
```

## 3. Entity Relationship Diagram

```
┌─────────────────────┐
│  TournamentEvent    │
│  ─────────────────  │
│  id (PK)            │
│  phase              │ ← Tournament-level phase (backward compat)
│  enrollmentOpenDate │
│  enrollmentCloseDate│
└──────────┬──────────┘
           │ 1:N
           │
┌──────────▼──────────────┐
│  TournamentSubEvent     │
│  ─────────────────────  │
│  id (PK)                │
│  eventId (FK)           │
│  enrollmentPhase ★      │ ← Per-event phase
│  enrollmentOpenDate ★   │
│  enrollmentCloseDate ★  │
│  maxEntries             │
│  currentEnrollmentCount ★│
│  autoPromoteFromWL ★    │
└──────────┬──────────────┘
           │ 1:N
           │
┌──────────▼──────────────┐         ┌─────────────────────┐
│  TournamentEnrollment   │ N:1     │  EnrollmentSession  │
│  ─────────────────────  │◄────────┤  ─────────────────  │
│  id (PK)                │         │  id (PK)            │
│  tournamentSubEventId   │         │  sessionKey         │
│  playerId (FK)          │         │  playerId (FK)      │
│  status                 │         │  status             │
│  sessionId (FK) ★       │         │  expiresAt          │
│  enrollmentSource ★     │         └─────────┬───────────┘
│  promotedFromWaitingL ★ │                   │ 1:N
│  requiresApproval ★     │                   │
└──────────┬──────────────┘         ┌─────────▼───────────────┐
           │ 1:N                    │  EnrollmentSessionItem  │
           │                        │  ─────────────────────  │
┌──────────▼──────────────┐         │  id (PK)                │
│  WaitingListLog ★       │         │  sessionId (FK)         │
│  ─────────────────────  │         │  tournamentSubEventId   │
│  id (PK)                │         │  preferredPartnerId     │
│  enrollmentId (FK)      │         │  validationStatus       │
│  action                 │         │  validationErrors       │
│  previousPosition       │         └─────────────────────────┘
│  newPosition            │
└─────────────────────────┘

Legend: ★ = New field
```

## 4. Key Database Constraints

### 4.1 Unique Constraints

```sql
-- Existing: One enrollment per player per sub-event
ALTER TABLE event."TournamentEnrollments"
  ADD CONSTRAINT "UQ_enrollment_player_subevent"
  UNIQUE ("tournamentSubEventId", "playerId")
  WHERE "playerId" IS NOT NULL;

-- Session key must be unique
ALTER TABLE event."EnrollmentSessions"
  ADD CONSTRAINT "UQ_session_key"
  UNIQUE ("sessionKey");

-- One item per sub-event per session
ALTER TABLE event."EnrollmentSessionItems"
  ADD CONSTRAINT "UQ_session_item"
  UNIQUE ("sessionId", "tournamentSubEventId");
```

### 4.2 Check Constraints

```sql
-- Enrollment phase must be valid
ALTER TABLE event."SubEventTournaments"
  ADD CONSTRAINT "CHK_enrollment_phase"
  CHECK ("enrollmentPhase" IN ('DRAFT', 'OPEN', 'CLOSED', 'WAITLIST_ONLY', 'FULL', 'LOCKED'));

-- Max entries must be positive
ALTER TABLE event."SubEventTournaments"
  ADD CONSTRAINT "CHK_max_entries_positive"
  CHECK ("maxEntries" IS NULL OR "maxEntries" > 0);

-- Current count cannot exceed max
ALTER TABLE event."SubEventTournaments"
  ADD CONSTRAINT "CHK_enrollment_count_valid"
  CHECK ("currentEnrollmentCount" >= 0 AND
         ("maxEntries" IS NULL OR "currentEnrollmentCount" <= "maxEntries"));

-- Waiting list position must be positive
ALTER TABLE event."TournamentEnrollments"
  ADD CONSTRAINT "CHK_waitlist_position_positive"
  CHECK ("waitingListPosition" IS NULL OR "waitingListPosition" > 0);

-- Session must expire in the future (on creation)
ALTER TABLE event."EnrollmentSessions"
  ADD CONSTRAINT "CHK_expires_future"
  CHECK ("expiresAt" > "createdAt");
```

### 4.3 Foreign Key Constraints

```sql
-- All already defined in table creation DDL above
-- Key cascading behaviors:
-- - Session deletion → CASCADE to session items
-- - SubEvent deletion → CASCADE to enrollments
-- - Player deletion → SET NULL (preserve enrollment records)
```

## 5. Performance Indexes

### 5.1 Query Pattern Analysis

**Common Queries:**
1. Get all sub-events with open enrollment for a tournament
2. Get all enrollments for a player across tournaments
3. Get waiting list for a sub-event (ordered by position)
4. Check enrollment capacity for bulk validation
5. Find expired sessions for cleanup

### 5.2 Recommended Indexes

```sql
-- Sub-event enrollment queries
CREATE INDEX "IDX_subevent_enrollment_phase"
  ON event."SubEventTournaments"("enrollmentPhase", "eventId");

CREATE INDEX "IDX_subevent_enrollment_dates"
  ON event."SubEventTournaments"("enrollmentOpenDate", "enrollmentCloseDate");

CREATE INDEX "IDX_subevent_capacity"
  ON event."SubEventTournaments"("maxEntries", "currentEnrollmentCount")
  WHERE "maxEntries" IS NOT NULL;

-- Enrollment queries
CREATE INDEX "IDX_enrollment_player_status"
  ON event."TournamentEnrollments"("playerId", "status");

CREATE INDEX "IDX_enrollment_subevent_status"
  ON event."TournamentEnrollments"("tournamentSubEventId", "status");

CREATE INDEX "IDX_enrollment_waitlist"
  ON event."TournamentEnrollments"("tournamentSubEventId", "waitingListPosition")
  WHERE "status" = 'WAITING_LIST' AND "waitingListPosition" IS NOT NULL;

CREATE INDEX "IDX_enrollment_source"
  ON event."TournamentEnrollments"("enrollmentSource", "createdAt");

-- Session cleanup
CREATE INDEX "IDX_session_expires"
  ON event."EnrollmentSessions"("expiresAt", "status");

-- Analytics indexes
CREATE INDEX "IDX_enrollment_created"
  ON event."TournamentEnrollments"("createdAt");

CREATE INDEX "IDX_enrollment_confirmed"
  ON event."TournamentEnrollments"("confirmedAt")
  WHERE "confirmedAt" IS NOT NULL;
```

## 6. Migration Strategy

### 6.1 Phase 1: Schema Extensions (Non-Breaking)

**Migration File:** `1734178000000-add-enrollment-control-fields.ts`

```typescript
public async up(queryRunner: QueryRunner): Promise<void> {
  // 1. Add new columns to TournamentSubEvent
  await queryRunner.query(`
    ALTER TABLE event."SubEventTournaments"
      ADD COLUMN "enrollmentOpenDate" timestamptz,
      ADD COLUMN "enrollmentCloseDate" timestamptz,
      ADD COLUMN "enrollmentPhase" varchar(50) DEFAULT 'DRAFT',
      ADD COLUMN "currentEnrollmentCount" integer DEFAULT 0,
      ADD COLUMN "confirmedEnrollmentCount" integer DEFAULT 0,
      ADD COLUMN "autoPromoteFromWaitingList" boolean DEFAULT true,
      ADD COLUMN "maxWaitingListSize" integer,
      ADD COLUMN "requiresApproval" boolean DEFAULT false,
      ADD COLUMN "allowGuestEnrollments" boolean DEFAULT true,
      ADD COLUMN "enrollmentNotes" text;
  `);

  // 2. Add check constraints
  await queryRunner.query(`
    ALTER TABLE event."SubEventTournaments"
      ADD CONSTRAINT "CHK_enrollment_phase"
      CHECK ("enrollmentPhase" IN ('DRAFT', 'OPEN', 'CLOSED', 'WAITLIST_ONLY', 'FULL', 'LOCKED'));
  `);

  // 3. Add indexes
  await queryRunner.query(`
    CREATE INDEX "IDX_subevent_enrollment_phase"
      ON event."SubEventTournaments"("enrollmentPhase", "eventId");
  `);

  // 4. Create new tables
  await queryRunner.query(`
    CREATE TABLE event."EnrollmentSessions" (
      "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now(),
      "sessionKey" varchar(255) UNIQUE NOT NULL,
      "playerId" uuid REFERENCES personal."Players"("id") ON DELETE CASCADE,
      "status" varchar(50) NOT NULL DEFAULT 'PENDING',
      "expiresAt" timestamptz NOT NULL,
      "ipAddress" varchar(45),
      "userAgent" text,
      "totalSubEvents" integer DEFAULT 0,
      "completedAt" timestamptz,
      CONSTRAINT "CHK_expires_future" CHECK ("expiresAt" > "createdAt")
    );
  `);

  await queryRunner.query(`
    CREATE TABLE event."EnrollmentSessionItems" (
      "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now(),
      "sessionId" uuid NOT NULL REFERENCES event."EnrollmentSessions"("id") ON DELETE CASCADE,
      "tournamentSubEventId" uuid NOT NULL REFERENCES event."SubEventTournaments"("id") ON DELETE CASCADE,
      "preferredPartnerId" uuid REFERENCES personal."Players"("id") ON DELETE SET NULL,
      "isGuestEnrollment" boolean DEFAULT false,
      "guestName" varchar(255),
      "guestEmail" varchar(255),
      "guestPhone" varchar(50),
      "validationStatus" varchar(50) DEFAULT 'PENDING',
      "validationErrors" jsonb,
      "notes" text,
      CONSTRAINT "UQ_session_subevent" UNIQUE ("sessionId", "tournamentSubEventId")
    );
  `);

  await queryRunner.query(`
    CREATE TABLE event."WaitingListLogs" (
      "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "enrollmentId" uuid NOT NULL REFERENCES event."TournamentEnrollments"("id") ON DELETE CASCADE,
      "tournamentSubEventId" uuid NOT NULL REFERENCES event."SubEventTournaments"("id") ON DELETE CASCADE,
      "action" varchar(50) NOT NULL,
      "previousPosition" integer,
      "newPosition" integer,
      "triggeredBy" varchar(50),
      "notes" text
    );
  `);
}
```

### 6.2 Phase 2: Data Migration

**Migration File:** `1734178100000-migrate-enrollment-data.ts`

```typescript
public async up(queryRunner: QueryRunner): Promise<void> {
  // 1. Migrate tournament-level enrollment dates to sub-events
  await queryRunner.query(`
    UPDATE event."SubEventTournaments" se
    SET
      "enrollmentOpenDate" = te."enrollmentOpenDate",
      "enrollmentCloseDate" = te."enrollmentCloseDate",
      "allowGuestEnrollments" = te."allowGuestEnrollments",
      "enrollmentPhase" = CASE
        WHEN te."phase" IN ('DRAFT') THEN 'DRAFT'
        WHEN te."phase" = 'ENROLLMENT_OPEN' THEN 'OPEN'
        WHEN te."phase" IN ('ENROLLMENT_CLOSED', 'DRAWS_MADE', 'SCHEDULED', 'IN_PROGRESS') THEN 'CLOSED'
        WHEN te."phase" = 'COMPLETED' THEN 'LOCKED'
        ELSE 'DRAFT'
      END
    FROM event."EventTournaments" te
    WHERE se."eventId" = te."id";
  `);

  // 2. Calculate current enrollment counts
  await queryRunner.query(`
    UPDATE event."SubEventTournaments" se
    SET
      "currentEnrollmentCount" = (
        SELECT COUNT(*)
        FROM event."TournamentEnrollments" e
        WHERE e."tournamentSubEventId" = se."id"
          AND e."status" IN ('PENDING', 'CONFIRMED')
      ),
      "confirmedEnrollmentCount" = (
        SELECT COUNT(*)
        FROM event."TournamentEnrollments" e
        WHERE e."tournamentSubEventId" = se."id"
          AND e."status" = 'CONFIRMED'
      );
  `);

  // 3. Update enrollmentPhase to FULL if capacity reached
  await queryRunner.query(`
    UPDATE event."SubEventTournaments"
    SET "enrollmentPhase" = 'FULL'
    WHERE "maxEntries" IS NOT NULL
      AND "currentEnrollmentCount" >= "maxEntries"
      AND "enrollmentPhase" = 'OPEN';
  `);
}
```

### 6.3 Phase 3: Add Enrollment Tracking Fields

**Migration File:** `1734178200000-enhance-enrollment-tracking.ts`

```typescript
public async up(queryRunner: QueryRunner): Promise<void> {
  // 1. Add tracking fields to TournamentEnrollments
  await queryRunner.query(`
    ALTER TABLE event."TournamentEnrollments"
      ADD COLUMN "sessionId" uuid REFERENCES event."EnrollmentSessions"("id") ON DELETE SET NULL,
      ADD COLUMN "enrollmentSource" varchar(50) DEFAULT 'MANUAL',
      ADD COLUMN "promotedAt" timestamptz,
      ADD COLUMN "promotedFromWaitingList" boolean DEFAULT false,
      ADD COLUMN "originalWaitingListPosition" integer,
      ADD COLUMN "requiresApproval" boolean DEFAULT false,
      ADD COLUMN "approvedBy" uuid REFERENCES personal."Players"("id") ON DELETE SET NULL,
      ADD COLUMN "approvedAt" timestamptz,
      ADD COLUMN "rejectionReason" text,
      ADD COLUMN "confirmedAt" timestamptz,
      ADD COLUMN "cancelledAt" timestamptz,
      ADD COLUMN "withdrawnAt" timestamptz;
  `);

  // 2. Backfill timestamp fields from status
  await queryRunner.query(`
    UPDATE event."TournamentEnrollments"
    SET "confirmedAt" = "updatedAt"
    WHERE "status" = 'CONFIRMED' AND "confirmedAt" IS NULL;
  `);

  await queryRunner.query(`
    UPDATE event."TournamentEnrollments"
    SET "cancelledAt" = "updatedAt"
    WHERE "status" = 'CANCELLED' AND "cancelledAt" IS NULL;
  `);

  await queryRunner.query(`
    UPDATE event."TournamentEnrollments"
    SET "withdrawnAt" = "updatedAt"
    WHERE "status" = 'WITHDRAWN' AND "withdrawnAt" IS NULL;
  `);

  // 3. Create indexes
  await queryRunner.query(`
    CREATE INDEX "IDX_enrollment_player_status"
      ON event."TournamentEnrollments"("playerId", "status");

    CREATE INDEX "IDX_enrollment_waitlist"
      ON event."TournamentEnrollments"("tournamentSubEventId", "waitingListPosition")
      WHERE "status" = 'WAITING_LIST' AND "waitingListPosition" IS NOT NULL;

    CREATE INDEX "IDX_enrollment_source"
      ON event."TournamentEnrollments"("enrollmentSource", "createdAt");
  `);
}
```

### 6.4 Rollback Strategy

Each migration includes a `down()` method to reverse changes:

```typescript
public async down(queryRunner: QueryRunner): Promise<void> {
  // Drop in reverse order of creation
  // 1. Drop indexes
  // 2. Drop constraints
  // 3. Drop columns
  // 4. Drop tables
}
```

## 7. Validation Rules

### 7.1 Database-Level Validation

Already covered in constraints above:
- Enrollment phase validity
- Positive capacity values
- Count <= max entries
- Unique enrollments per player/sub-event
- Future expiration dates

### 7.2 Application-Level Validation

Implement in TypeORM entity decorators and services:

```typescript
// In TournamentSubEvent entity
@Column()
@Min(0)
currentEnrollmentCount: number;

@Column()
@Min(1)
@IsOptional()
maxEntries?: number;

// In service layer
async validateEnrollment(
  subEventId: string,
  playerId: string
): Promise<ValidationResult> {
  const subEvent = await this.findOne(subEventId);

  // Check enrollment phase
  if (!['OPEN', 'WAITLIST_ONLY'].includes(subEvent.enrollmentPhase)) {
    return { valid: false, error: 'Enrollment not open' };
  }

  // Check dates
  const now = new Date();
  if (subEvent.enrollmentOpenDate && now < subEvent.enrollmentOpenDate) {
    return { valid: false, error: 'Enrollment not yet open' };
  }
  if (subEvent.enrollmentCloseDate && now > subEvent.enrollmentCloseDate) {
    return { valid: false, error: 'Enrollment closed' };
  }

  // Check capacity
  if (subEvent.maxEntries &&
      subEvent.currentEnrollmentCount >= subEvent.maxEntries &&
      subEvent.enrollmentPhase !== 'WAITLIST_ONLY') {
    return { valid: false, error: 'Event full' };
  }

  // Check level restrictions
  const player = await this.playerService.findOne(playerId);
  if (subEvent.minLevel && player.level < subEvent.minLevel) {
    return { valid: false, error: 'Level too low' };
  }
  if (subEvent.maxLevel && player.level > subEvent.maxLevel) {
    return { valid: false, error: 'Level too high' };
  }

  return { valid: true };
}
```

## 8. Common Query Patterns

### 8.1 Get Available Sub-Events for Enrollment

```sql
SELECT se.*
FROM event."SubEventTournaments" se
JOIN event."EventTournaments" te ON se."eventId" = te.id
WHERE te.id = $1
  AND se."enrollmentPhase" IN ('OPEN', 'WAITLIST_ONLY')
  AND (se."enrollmentOpenDate" IS NULL OR se."enrollmentOpenDate" <= NOW())
  AND (se."enrollmentCloseDate" IS NULL OR se."enrollmentCloseDate" >= NOW())
  AND (se."maxEntries" IS NULL OR se."currentEnrollmentCount" < se."maxEntries"
       OR se."enrollmentPhase" = 'WAITLIST_ONLY')
ORDER BY se."eventType", se."gameType";
```

### 8.2 Get Player's Current Enrollments

```sql
SELECT e.*, se."name", se."eventType", se."gameType", te."name" as "tournamentName"
FROM event."TournamentEnrollments" e
JOIN event."SubEventTournaments" se ON e."tournamentSubEventId" = se.id
JOIN event."EventTournaments" te ON se."eventId" = te.id
WHERE e."playerId" = $1
  AND e."status" IN ('PENDING', 'CONFIRMED', 'WAITING_LIST')
ORDER BY te."firstDay", se."name";
```

### 8.3 Get Waiting List for Sub-Event

```sql
SELECT e.*, p."firstName", p."lastName"
FROM event."TournamentEnrollments" e
JOIN personal."Players" p ON e."playerId" = p.id
WHERE e."tournamentSubEventId" = $1
  AND e."status" = 'WAITING_LIST'
ORDER BY e."waitingListPosition" ASC;
```

### 8.4 Auto-Promote from Waiting List

```sql
-- Find next waiting list candidate
WITH next_candidate AS (
  SELECT e.*
  FROM event."TournamentEnrollments" e
  JOIN event."SubEventTournaments" se ON e."tournamentSubEventId" = se.id
  WHERE e."tournamentSubEventId" = $1
    AND e."status" = 'WAITING_LIST'
    AND se."autoPromoteFromWaitingList" = true
    AND se."currentEnrollmentCount" < se."maxEntries"
  ORDER BY e."waitingListPosition" ASC
  LIMIT 1
)
UPDATE event."TournamentEnrollments"
SET
  "status" = 'CONFIRMED',
  "promotedAt" = NOW(),
  "promotedFromWaitingList" = true,
  "originalWaitingListPosition" = "waitingListPosition",
  "waitingListPosition" = NULL
WHERE id = (SELECT id FROM next_candidate)
RETURNING *;
```

### 8.5 Bulk Enrollment Validation

```sql
-- Check capacity for multiple sub-events
SELECT
  se.id,
  se."name",
  se."maxEntries",
  se."currentEnrollmentCount",
  se."enrollmentPhase",
  CASE
    WHEN se."enrollmentPhase" NOT IN ('OPEN', 'WAITLIST_ONLY') THEN 'CLOSED'
    WHEN se."maxEntries" IS NOT NULL AND se."currentEnrollmentCount" >= se."maxEntries" THEN 'FULL'
    WHEN se."enrollmentOpenDate" > NOW() THEN 'NOT_YET_OPEN'
    WHEN se."enrollmentCloseDate" < NOW() THEN 'CLOSED'
    ELSE 'AVAILABLE'
  END as availability_status
FROM event."SubEventTournaments" se
WHERE se.id = ANY($1::uuid[]);
```

## 9. Automatic Triggers and Functions

### 9.1 Auto-Update Enrollment Counts

```sql
CREATE OR REPLACE FUNCTION update_subevent_enrollment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE event."SubEventTournaments"
    SET
      "currentEnrollmentCount" = "currentEnrollmentCount" + 1,
      "confirmedEnrollmentCount" = "confirmedEnrollmentCount" +
        CASE WHEN NEW."status" = 'CONFIRMED' THEN 1 ELSE 0 END
    WHERE id = NEW."tournamentSubEventId";

  ELSIF TG_OP = 'UPDATE' THEN
    -- Status changed
    IF OLD."status" != NEW."status" THEN
      UPDATE event."SubEventTournaments"
      SET
        "confirmedEnrollmentCount" = "confirmedEnrollmentCount" +
          CASE
            WHEN NEW."status" = 'CONFIRMED' AND OLD."status" != 'CONFIRMED' THEN 1
            WHEN NEW."status" != 'CONFIRMED' AND OLD."status" = 'CONFIRMED' THEN -1
            ELSE 0
          END,
        "currentEnrollmentCount" = "currentEnrollmentCount" +
          CASE
            WHEN NEW."status" IN ('CANCELLED', 'WITHDRAWN') AND
                 OLD."status" NOT IN ('CANCELLED', 'WITHDRAWN') THEN -1
            WHEN NEW."status" NOT IN ('CANCELLED', 'WITHDRAWN') AND
                 OLD."status" IN ('CANCELLED', 'WITHDRAWN') THEN 1
            ELSE 0
          END
      WHERE id = NEW."tournamentSubEventId";
    END IF;

  ELSIF TG_OP = 'DELETE' THEN
    UPDATE event."SubEventTournaments"
    SET
      "currentEnrollmentCount" = "currentEnrollmentCount" - 1,
      "confirmedEnrollmentCount" = "confirmedEnrollmentCount" -
        CASE WHEN OLD."status" = 'CONFIRMED' THEN 1 ELSE 0 END
    WHERE id = OLD."tournamentSubEventId";
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enrollment_count_trigger
AFTER INSERT OR UPDATE OR DELETE ON event."TournamentEnrollments"
FOR EACH ROW
EXECUTE FUNCTION update_subevent_enrollment_count();
```

### 9.2 Auto-Update Enrollment Phase

```sql
CREATE OR REPLACE FUNCTION update_enrollment_phase()
RETURNS TRIGGER AS $$
BEGIN
  -- Mark as FULL when capacity reached
  IF NEW."maxEntries" IS NOT NULL AND
     NEW."currentEnrollmentCount" >= NEW."maxEntries" AND
     NEW."enrollmentPhase" = 'OPEN' THEN
    NEW."enrollmentPhase" = 'FULL';

  -- Reopen if enrollment count drops
  ELSIF NEW."maxEntries" IS NOT NULL AND
        NEW."currentEnrollmentCount" < NEW."maxEntries" AND
        NEW."enrollmentPhase" = 'FULL' AND
        (NEW."enrollmentCloseDate" IS NULL OR NEW."enrollmentCloseDate" >= NOW()) THEN
    NEW."enrollmentPhase" = 'OPEN';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enrollment_phase_trigger
BEFORE UPDATE ON event."SubEventTournaments"
FOR EACH ROW
WHEN (OLD."currentEnrollmentCount" IS DISTINCT FROM NEW."currentEnrollmentCount")
EXECUTE FUNCTION update_enrollment_phase();
```

### 9.3 Waiting List Log Trigger

```sql
CREATE OR REPLACE FUNCTION log_waitlist_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Log when added to waiting list
  IF TG_OP = 'INSERT' AND NEW."status" = 'WAITING_LIST' THEN
    INSERT INTO event."WaitingListLogs"
      ("enrollmentId", "tournamentSubEventId", "action", "newPosition", "triggeredBy")
    VALUES
      (NEW.id, NEW."tournamentSubEventId", 'ADDED', NEW."waitingListPosition", 'SYSTEM');

  -- Log when promoted from waiting list
  ELSIF TG_OP = 'UPDATE' AND
        OLD."status" = 'WAITING_LIST' AND
        NEW."status" IN ('CONFIRMED', 'PENDING') THEN
    INSERT INTO event."WaitingListLogs"
      ("enrollmentId", "tournamentSubEventId", "action", "previousPosition", "triggeredBy")
    VALUES
      (NEW.id, NEW."tournamentSubEventId", 'PROMOTED', OLD."waitingListPosition",
       CASE WHEN NEW."promotedFromWaitingList" THEN 'AUTO_PROMOTE' ELSE 'MANUAL' END);

  -- Log position changes
  ELSIF TG_OP = 'UPDATE' AND
        NEW."status" = 'WAITING_LIST' AND
        OLD."waitingListPosition" IS DISTINCT FROM NEW."waitingListPosition" THEN
    INSERT INTO event."WaitingListLogs"
      ("enrollmentId", "tournamentSubEventId", "action",
       "previousPosition", "newPosition", "triggeredBy")
    VALUES
      (NEW.id, NEW."tournamentSubEventId", 'POSITION_CHANGED',
       OLD."waitingListPosition", NEW."waitingListPosition", 'SYSTEM');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER waitlist_log_trigger
AFTER INSERT OR UPDATE ON event."TournamentEnrollments"
FOR EACH ROW
EXECUTE FUNCTION log_waitlist_changes();
```

## 10. Backward Compatibility

### 10.1 Existing Functionality Preserved

- `TournamentEnrollment` table unchanged in structure (only additions)
- Tournament-level `phase` still controls overall tournament state
- Existing enrollment queries continue to work
- No breaking changes to GraphQL schema (only additions)

### 10.2 Migration Path for Existing Data

1. All existing sub-events inherit tournament-level enrollment dates
2. Enrollment phase derived from tournament phase
3. Current enrollment counts calculated from existing data
4. All existing enrollments remain valid

### 10.3 Dual-Mode Operation

During transition period:
- Tournament-level phase controls legacy flows
- Per-sub-event phase enables new enrollment page
- System respects whichever is more restrictive

```typescript
function canEnrollInSubEvent(tournament, subEvent): boolean {
  // Check both tournament and sub-event level
  const tournamentAllows = tournament.phase === 'ENROLLMENT_OPEN';
  const subEventAllows = ['OPEN', 'WAITLIST_ONLY'].includes(subEvent.enrollmentPhase);

  return tournamentAllows && subEventAllows;
}
```

## 11. Testing Strategy

### 11.1 Migration Testing

1. Create test dataset with various enrollment scenarios
2. Run migration in test environment
3. Verify data integrity:
   - All enrollment counts accurate
   - Phases correctly derived
   - No lost data
   - Constraints valid

### 11.2 Performance Testing

1. Load test with 1000+ sub-events
2. Bulk enrollment simulation (100+ simultaneous users)
3. Waiting list promotion stress test
4. Query performance benchmarks

### 11.3 Integration Testing

1. Multi-event enrollment flow
2. Waiting list auto-promotion
3. Session expiration handling
4. Capacity validation
5. Concurrent enrollment conflicts

## 12. Security Considerations

### 12.1 Data Protection

- Session keys cryptographically random (UUID v4)
- IP address hashing for GDPR compliance (optional)
- Guest email/phone encrypted at rest (recommended)

### 12.2 Rate Limiting

- Limit enrollment attempts per IP/user
- Session creation throttling
- Prevent waiting list position gaming

### 12.3 Audit Trail

- All enrollment changes logged with timestamps
- Waiting list movements tracked
- Admin actions attributed to user

## 13. Future Enhancements

### 13.1 Potential Extensions

1. **Payment Integration**: Add payment tracking to `EnrollmentSessionItem`
2. **Team Enrollments**: Support club/team bulk enrollments
3. **Partner Matching**: Algorithm to suggest compatible partners
4. **Notifications**: Email/SMS alerts for waiting list promotion
5. **Analytics**: Enrollment funnel tracking and conversion metrics

### 13.2 Schema Evolution

Fields marked for future use:
- `validationErrors` (jsonb) - flexible error structure
- `enrollmentNotes` (text) - admin notes
- Session `userAgent` - device tracking for analytics

## 14. Summary

This schema design provides:

**Key Features:**
- Per-sub-event enrollment control with independent phases
- Multi-discipline cart-based enrollment
- Automatic waiting list management
- Full backward compatibility
- Comprehensive audit trail
- Optimized query performance

**Migration Approach:**
- 3-phase incremental deployment
- Zero downtime
- Full rollback support
- Data integrity guaranteed

**Scalability:**
- Indexed for common queries
- Denormalized counts for performance
- Automated triggers reduce application logic
- Prepared for future extensions

The design is production-ready and can be deployed incrementally without disrupting existing functionality.
