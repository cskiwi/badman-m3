import { MigrationInterface, QueryRunner } from "typeorm";

export class AddEnrollmentControlFields1734178000000 implements MigrationInterface {
    name = 'AddEnrollmentControlFields1734178000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // ===================================================================
        // PHASE 1: Add per-sub-event enrollment control to TournamentSubEvent
        // ===================================================================

        // Add new columns for per-event enrollment management
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
            ADD COLUMN "enrollmentNotes" text
        `);

        // Add check constraint for enrollment phase
        await queryRunner.query(`
            ALTER TABLE event."SubEventTournaments"
            ADD CONSTRAINT "CHK_enrollment_phase"
            CHECK ("enrollmentPhase" IN ('DRAFT', 'OPEN', 'CLOSED', 'WAITLIST_ONLY', 'FULL', 'LOCKED'))
        `);

        // Add check constraint for max entries
        await queryRunner.query(`
            ALTER TABLE event."SubEventTournaments"
            ADD CONSTRAINT "CHK_max_entries_positive"
            CHECK ("maxEntries" IS NULL OR "maxEntries" > 0)
        `);

        // Add check constraint for enrollment count validation
        await queryRunner.query(`
            ALTER TABLE event."SubEventTournaments"
            ADD CONSTRAINT "CHK_enrollment_count_valid"
            CHECK (
                "currentEnrollmentCount" >= 0 AND
                ("maxEntries" IS NULL OR "currentEnrollmentCount" <= "maxEntries" + COALESCE("maxWaitingListSize", 0))
            )
        `);

        // Add indexes for enrollment queries
        await queryRunner.query(`
            CREATE INDEX "IDX_subevent_enrollment_phase"
            ON event."SubEventTournaments"("enrollmentPhase", "eventId")
        `);

        await queryRunner.query(`
            CREATE INDEX "IDX_subevent_enrollment_dates"
            ON event."SubEventTournaments"("enrollmentOpenDate", "enrollmentCloseDate")
        `);

        await queryRunner.query(`
            CREATE INDEX "IDX_subevent_capacity"
            ON event."SubEventTournaments"("maxEntries", "currentEnrollmentCount")
            WHERE "maxEntries" IS NOT NULL
        `);

        // ===================================================================
        // PHASE 2: Create EnrollmentSessions table
        // ===================================================================

        await queryRunner.query(`
            CREATE TABLE event."EnrollmentSessions" (
                "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                "createdAt" timestamptz NOT NULL DEFAULT now(),
                "updatedAt" timestamptz NOT NULL DEFAULT now(),
                "sessionKey" varchar(255) UNIQUE NOT NULL,
                "playerId" uuid REFERENCES "Players"("id") ON DELETE CASCADE,
                "status" varchar(50) NOT NULL DEFAULT 'PENDING',
                "expiresAt" timestamptz NOT NULL,
                "ipAddress" varchar(45),
                "userAgent" text,
                "totalSubEvents" integer DEFAULT 0,
                "completedAt" timestamptz,
                CONSTRAINT "CHK_expires_future" CHECK ("expiresAt" > "createdAt")
            )
        `);

        // Add indexes for session queries
        await queryRunner.query(`
            CREATE INDEX "IDX_enrollment_sessions_player"
            ON event."EnrollmentSessions"("playerId")
        `);

        await queryRunner.query(`
            CREATE INDEX "IDX_enrollment_sessions_status"
            ON event."EnrollmentSessions"("status")
        `);

        await queryRunner.query(`
            CREATE INDEX "IDX_enrollment_sessions_expires"
            ON event."EnrollmentSessions"("expiresAt")
        `);

        await queryRunner.query(`
            CREATE INDEX "IDX_enrollment_sessions_created"
            ON event."EnrollmentSessions"("createdAt")
        `);

        // ===================================================================
        // PHASE 3: Create EnrollmentSessionItems table
        // ===================================================================

        await queryRunner.query(`
            CREATE TABLE event."EnrollmentSessionItems" (
                "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                "createdAt" timestamptz NOT NULL DEFAULT now(),
                "updatedAt" timestamptz NOT NULL DEFAULT now(),
                "sessionId" uuid NOT NULL REFERENCES event."EnrollmentSessions"("id") ON DELETE CASCADE,
                "tournamentSubEventId" uuid NOT NULL REFERENCES event."SubEventTournaments"("id") ON DELETE CASCADE,
                "preferredPartnerId" uuid REFERENCES "Players"("id") ON DELETE SET NULL,
                "isGuestEnrollment" boolean DEFAULT false,
                "guestName" varchar(255),
                "guestEmail" varchar(255),
                "guestPhone" varchar(50),
                "validationStatus" varchar(50) DEFAULT 'PENDING',
                "validationErrors" jsonb,
                "notes" text,
                CONSTRAINT "UQ_session_subevent" UNIQUE ("sessionId", "tournamentSubEventId")
            )
        `);

        // Add indexes for session item queries
        await queryRunner.query(`
            CREATE INDEX "IDX_session_items_session"
            ON event."EnrollmentSessionItems"("sessionId")
        `);

        await queryRunner.query(`
            CREATE INDEX "IDX_session_items_subevent"
            ON event."EnrollmentSessionItems"("tournamentSubEventId")
        `);

        await queryRunner.query(`
            CREATE INDEX "IDX_session_items_validation"
            ON event."EnrollmentSessionItems"("validationStatus")
        `);

        // ===================================================================
        // PHASE 4: Create WaitingListLogs table
        // ===================================================================

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
            )
        `);

        // Add indexes for waiting list log queries
        await queryRunner.query(`
            CREATE INDEX "IDX_waitlist_log_enrollment"
            ON event."WaitingListLogs"("enrollmentId")
        `);

        await queryRunner.query(`
            CREATE INDEX "IDX_waitlist_log_subevent"
            ON event."WaitingListLogs"("tournamentSubEventId")
        `);

        await queryRunner.query(`
            CREATE INDEX "IDX_waitlist_log_created"
            ON event."WaitingListLogs"("createdAt")
        `);

        await queryRunner.query(`
            CREATE INDEX "IDX_waitlist_log_action"
            ON event."WaitingListLogs"("action", "createdAt")
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop tables in reverse order
        await queryRunner.query(`DROP TABLE IF EXISTS event."WaitingListLogs" CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS event."EnrollmentSessionItems" CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS event."EnrollmentSessions" CASCADE`);

        // Drop indexes from SubEventTournaments
        await queryRunner.query(`DROP INDEX IF EXISTS event."IDX_subevent_capacity"`);
        await queryRunner.query(`DROP INDEX IF EXISTS event."IDX_subevent_enrollment_dates"`);
        await queryRunner.query(`DROP INDEX IF EXISTS event."IDX_subevent_enrollment_phase"`);

        // Drop constraints
        await queryRunner.query(`
            ALTER TABLE event."SubEventTournaments"
            DROP CONSTRAINT IF EXISTS "CHK_enrollment_count_valid"
        `);
        await queryRunner.query(`
            ALTER TABLE event."SubEventTournaments"
            DROP CONSTRAINT IF EXISTS "CHK_max_entries_positive"
        `);
        await queryRunner.query(`
            ALTER TABLE event."SubEventTournaments"
            DROP CONSTRAINT IF EXISTS "CHK_enrollment_phase"
        `);

        // Drop columns
        await queryRunner.query(`
            ALTER TABLE event."SubEventTournaments"
            DROP COLUMN IF EXISTS "enrollmentNotes",
            DROP COLUMN IF EXISTS "allowGuestEnrollments",
            DROP COLUMN IF EXISTS "requiresApproval",
            DROP COLUMN IF EXISTS "maxWaitingListSize",
            DROP COLUMN IF EXISTS "autoPromoteFromWaitingList",
            DROP COLUMN IF EXISTS "confirmedEnrollmentCount",
            DROP COLUMN IF EXISTS "currentEnrollmentCount",
            DROP COLUMN IF EXISTS "enrollmentPhase",
            DROP COLUMN IF EXISTS "enrollmentCloseDate",
            DROP COLUMN IF EXISTS "enrollmentOpenDate"
        `);
    }
}
