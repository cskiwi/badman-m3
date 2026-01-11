import { MigrationInterface, QueryRunner } from "typeorm";

export class EnhanceEnrollmentTracking1734178200000 implements MigrationInterface {
    name = 'EnhanceEnrollmentTracking1734178200000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // ===================================================================
        // PHASE 1: Add tracking fields to TournamentEnrollments
        // ===================================================================

        console.log('Adding enrollment tracking fields...');

        await queryRunner.query(`
            ALTER TABLE event."TournamentEnrollments"
            ADD COLUMN "sessionId" uuid,
            ADD COLUMN "enrollmentSource" varchar(50) DEFAULT 'MANUAL',
            ADD COLUMN "promotedAt" timestamptz,
            ADD COLUMN "promotedFromWaitingList" boolean DEFAULT false,
            ADD COLUMN "originalWaitingListPosition" integer,
            ADD COLUMN "requiresApproval" boolean DEFAULT false,
            ADD COLUMN "approvedBy" uuid,
            ADD COLUMN "approvedAt" timestamptz,
            ADD COLUMN "rejectionReason" text,
            ADD COLUMN "confirmedAt" timestamptz,
            ADD COLUMN "cancelledAt" timestamptz,
            ADD COLUMN "withdrawnAt" timestamptz
        `);

        // Add foreign key constraints
        await queryRunner.query(`
            ALTER TABLE event."TournamentEnrollments"
            ADD CONSTRAINT "FK_enrollment_session"
            FOREIGN KEY ("sessionId")
            REFERENCES event."EnrollmentSessions"("id")
            ON DELETE SET NULL
        `);

        await queryRunner.query(`
            ALTER TABLE event."TournamentEnrollments"
            ADD CONSTRAINT "FK_enrollment_approved_by"
            FOREIGN KEY ("approvedBy")
            REFERENCES "Players"("id")
            ON DELETE SET NULL
        `);

        // ===================================================================
        // PHASE 2: Backfill timestamp fields from existing data
        // ===================================================================

        console.log('Backfilling timestamp data...');

        // Set confirmedAt for confirmed enrollments
        await queryRunner.query(`
            UPDATE event."TournamentEnrollments"
            SET "confirmedAt" = "updatedAt"
            WHERE "status" = 'CONFIRMED'
              AND "confirmedAt" IS NULL
        `);

        // Set cancelledAt for cancelled enrollments
        await queryRunner.query(`
            UPDATE event."TournamentEnrollments"
            SET "cancelledAt" = "updatedAt"
            WHERE "status" = 'CANCELLED'
              AND "cancelledAt" IS NULL
        `);

        // Set withdrawnAt for withdrawn enrollments
        await queryRunner.query(`
            UPDATE event."TournamentEnrollments"
            SET "withdrawnAt" = "updatedAt"
            WHERE "status" = 'WITHDRAWN'
              AND "withdrawnAt" IS NULL
        `);

        // ===================================================================
        // PHASE 3: Add check constraints
        // ===================================================================

        await queryRunner.query(`
            ALTER TABLE event."TournamentEnrollments"
            ADD CONSTRAINT "CHK_waitlist_position_positive"
            CHECK ("waitingListPosition" IS NULL OR "waitingListPosition" > 0)
        `);

        await queryRunner.query(`
            ALTER TABLE event."TournamentEnrollments"
            ADD CONSTRAINT "CHK_enrollment_source_valid"
            CHECK ("enrollmentSource" IN ('MANUAL', 'PUBLIC_FORM', 'IMPORT', 'AUTO_PROMOTED'))
        `);

        // ===================================================================
        // PHASE 4: Create indexes for performance
        // ===================================================================

        console.log('Creating performance indexes...');

        await queryRunner.query(`
            CREATE INDEX "IDX_enrollment_player_status"
            ON event."TournamentEnrollments"("playerId", "status")
        `);

        await queryRunner.query(`
            CREATE INDEX "IDX_enrollment_subevent_status"
            ON event."TournamentEnrollments"("tournamentSubEventId", "status")
        `);

        await queryRunner.query(`
            CREATE INDEX "IDX_enrollment_waitlist"
            ON event."TournamentEnrollments"("tournamentSubEventId", "waitingListPosition")
            WHERE "status" = 'WAITING_LIST' AND "waitingListPosition" IS NOT NULL
        `);

        await queryRunner.query(`
            CREATE INDEX "IDX_enrollment_source"
            ON event."TournamentEnrollments"("enrollmentSource", "createdAt")
        `);

        await queryRunner.query(`
            CREATE INDEX "IDX_enrollment_session"
            ON event."TournamentEnrollments"("sessionId")
            WHERE "sessionId" IS NOT NULL
        `);

        await queryRunner.query(`
            CREATE INDEX "IDX_enrollment_confirmed_at"
            ON event."TournamentEnrollments"("confirmedAt")
            WHERE "confirmedAt" IS NOT NULL
        `);

        await queryRunner.query(`
            CREATE INDEX "IDX_enrollment_promoted"
            ON event."TournamentEnrollments"("promotedFromWaitingList", "promotedAt")
            WHERE "promotedFromWaitingList" = true
        `);

        await queryRunner.query(`
            CREATE INDEX "IDX_enrollment_requires_approval"
            ON event."TournamentEnrollments"("requiresApproval", "approvedAt")
            WHERE "requiresApproval" = true
        `);

        // ===================================================================
        // PHASE 5: Create database triggers for automation
        // ===================================================================

        console.log('Creating database triggers...');

        // Trigger to auto-update enrollment counts
        await queryRunner.query(`
            CREATE OR REPLACE FUNCTION update_subevent_enrollment_count()
            RETURNS TRIGGER AS $$
            BEGIN
                IF TG_OP = 'INSERT' THEN
                    -- New enrollment added
                    IF NEW."status" IN ('PENDING', 'CONFIRMED', 'WAITING_LIST') THEN
                        UPDATE event."SubEventTournaments"
                        SET
                            "currentEnrollmentCount" = "currentEnrollmentCount" + 1,
                            "confirmedEnrollmentCount" = "confirmedEnrollmentCount" +
                                CASE WHEN NEW."status" = 'CONFIRMED' THEN 1 ELSE 0 END
                        WHERE "id" = NEW."tournamentSubEventId";
                    END IF;

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
                        WHERE "id" = NEW."tournamentSubEventId";
                    END IF;

                ELSIF TG_OP = 'DELETE' THEN
                    -- Enrollment deleted
                    IF OLD."status" IN ('PENDING', 'CONFIRMED', 'WAITING_LIST') THEN
                        UPDATE event."SubEventTournaments"
                        SET
                            "currentEnrollmentCount" = GREATEST("currentEnrollmentCount" - 1, 0),
                            "confirmedEnrollmentCount" = GREATEST(
                                "confirmedEnrollmentCount" - CASE WHEN OLD."status" = 'CONFIRMED' THEN 1 ELSE 0 END,
                                0
                            )
                        WHERE "id" = OLD."tournamentSubEventId";
                    END IF;
                    RETURN OLD;
                END IF;

                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
        `);

        await queryRunner.query(`
            CREATE TRIGGER enrollment_count_trigger
            AFTER INSERT OR UPDATE OR DELETE ON event."TournamentEnrollments"
            FOR EACH ROW
            EXECUTE FUNCTION update_subevent_enrollment_count()
        `);

        // Trigger to auto-update enrollment phase based on capacity
        await queryRunner.query(`
            CREATE OR REPLACE FUNCTION update_enrollment_phase()
            RETURNS TRIGGER AS $$
            BEGIN
                -- Mark as FULL when capacity reached
                IF NEW."maxEntries" IS NOT NULL AND
                   NEW."currentEnrollmentCount" >= NEW."maxEntries" AND
                   NEW."enrollmentPhase" = 'OPEN' THEN
                    NEW."enrollmentPhase" = 'FULL';

                -- Reopen if enrollment count drops and still within enrollment period
                ELSIF NEW."maxEntries" IS NOT NULL AND
                      NEW."currentEnrollmentCount" < NEW."maxEntries" AND
                      NEW."enrollmentPhase" = 'FULL' AND
                      (NEW."enrollmentCloseDate" IS NULL OR NEW."enrollmentCloseDate" >= NOW()) THEN
                    NEW."enrollmentPhase" = 'OPEN';
                END IF;

                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
        `);

        await queryRunner.query(`
            CREATE TRIGGER enrollment_phase_trigger
            BEFORE UPDATE ON event."SubEventTournaments"
            FOR EACH ROW
            WHEN (OLD."currentEnrollmentCount" IS DISTINCT FROM NEW."currentEnrollmentCount")
            EXECUTE FUNCTION update_enrollment_phase()
        `);

        // Trigger to log waiting list changes
        await queryRunner.query(`
            CREATE OR REPLACE FUNCTION log_waitlist_changes()
            RETURNS TRIGGER AS $$
            BEGIN
                -- Log when added to waiting list
                IF TG_OP = 'INSERT' AND NEW."status" = 'WAITING_LIST' THEN
                    INSERT INTO event."WaitingListLogs"
                        ("enrollmentId", "tournamentSubEventId", "action", "newPosition", "triggeredBy")
                    VALUES
                        (NEW."id", NEW."tournamentSubEventId", 'ADDED', NEW."waitingListPosition", 'SYSTEM');

                -- Log when promoted from waiting list
                ELSIF TG_OP = 'UPDATE' AND
                      OLD."status" = 'WAITING_LIST' AND
                      NEW."status" IN ('CONFIRMED', 'PENDING') THEN
                    INSERT INTO event."WaitingListLogs"
                        ("enrollmentId", "tournamentSubEventId", "action", "previousPosition", "triggeredBy")
                    VALUES
                        (NEW."id", NEW."tournamentSubEventId", 'PROMOTED', OLD."waitingListPosition",
                         CASE WHEN NEW."promotedFromWaitingList" THEN 'AUTO_PROMOTE' ELSE 'MANUAL' END);

                -- Log position changes
                ELSIF TG_OP = 'UPDATE' AND
                      NEW."status" = 'WAITING_LIST' AND
                      OLD."waitingListPosition" IS DISTINCT FROM NEW."waitingListPosition" THEN
                    INSERT INTO event."WaitingListLogs"
                        ("enrollmentId", "tournamentSubEventId", "action",
                         "previousPosition", "newPosition", "triggeredBy")
                    VALUES
                        (NEW."id", NEW."tournamentSubEventId", 'POSITION_CHANGED',
                         OLD."waitingListPosition", NEW."waitingListPosition", 'SYSTEM');

                -- Log when removed from waiting list (not promoted)
                ELSIF TG_OP = 'UPDATE' AND
                      OLD."status" = 'WAITING_LIST' AND
                      NEW."status" NOT IN ('CONFIRMED', 'PENDING') THEN
                    INSERT INTO event."WaitingListLogs"
                        ("enrollmentId", "tournamentSubEventId", "action", "previousPosition", "triggeredBy")
                    VALUES
                        (NEW."id", NEW."tournamentSubEventId", 'REMOVED', OLD."waitingListPosition", 'SYSTEM');
                END IF;

                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
        `);

        await queryRunner.query(`
            CREATE TRIGGER waitlist_log_trigger
            AFTER INSERT OR UPDATE ON event."TournamentEnrollments"
            FOR EACH ROW
            EXECUTE FUNCTION log_waitlist_changes()
        `);

        // Trigger to auto-set timestamp fields
        await queryRunner.query(`
            CREATE OR REPLACE FUNCTION set_enrollment_timestamps()
            RETURNS TRIGGER AS $$
            BEGIN
                -- Set confirmedAt when status changes to CONFIRMED
                IF NEW."status" = 'CONFIRMED' AND OLD."status" != 'CONFIRMED' THEN
                    NEW."confirmedAt" = NOW();
                END IF;

                -- Set cancelledAt when status changes to CANCELLED
                IF NEW."status" = 'CANCELLED' AND OLD."status" != 'CANCELLED' THEN
                    NEW."cancelledAt" = NOW();
                END IF;

                -- Set withdrawnAt when status changes to WITHDRAWN
                IF NEW."status" = 'WITHDRAWN' AND OLD."status" != 'WITHDRAWN' THEN
                    NEW."withdrawnAt" = NOW();
                END IF;

                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
        `);

        await queryRunner.query(`
            CREATE TRIGGER enrollment_timestamps_trigger
            BEFORE UPDATE ON event."TournamentEnrollments"
            FOR EACH ROW
            WHEN (OLD."status" IS DISTINCT FROM NEW."status")
            EXECUTE FUNCTION set_enrollment_timestamps()
        `);

        console.log('Enhancement migration completed successfully.');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        console.log('Rolling back enrollment tracking enhancements...');

        // Drop triggers
        await queryRunner.query(`DROP TRIGGER IF EXISTS enrollment_timestamps_trigger ON event."TournamentEnrollments"`);
        await queryRunner.query(`DROP TRIGGER IF EXISTS waitlist_log_trigger ON event."TournamentEnrollments"`);
        await queryRunner.query(`DROP TRIGGER IF EXISTS enrollment_phase_trigger ON event."SubEventTournaments"`);
        await queryRunner.query(`DROP TRIGGER IF EXISTS enrollment_count_trigger ON event."TournamentEnrollments"`);

        // Drop functions
        await queryRunner.query(`DROP FUNCTION IF EXISTS set_enrollment_timestamps()`);
        await queryRunner.query(`DROP FUNCTION IF EXISTS log_waitlist_changes()`);
        await queryRunner.query(`DROP FUNCTION IF EXISTS update_enrollment_phase()`);
        await queryRunner.query(`DROP FUNCTION IF EXISTS update_subevent_enrollment_count()`);

        // Drop indexes
        await queryRunner.query(`DROP INDEX IF EXISTS event."IDX_enrollment_requires_approval"`);
        await queryRunner.query(`DROP INDEX IF EXISTS event."IDX_enrollment_promoted"`);
        await queryRunner.query(`DROP INDEX IF EXISTS event."IDX_enrollment_confirmed_at"`);
        await queryRunner.query(`DROP INDEX IF EXISTS event."IDX_enrollment_session"`);
        await queryRunner.query(`DROP INDEX IF EXISTS event."IDX_enrollment_source"`);
        await queryRunner.query(`DROP INDEX IF EXISTS event."IDX_enrollment_waitlist"`);
        await queryRunner.query(`DROP INDEX IF EXISTS event."IDX_enrollment_subevent_status"`);
        await queryRunner.query(`DROP INDEX IF EXISTS event."IDX_enrollment_player_status"`);

        // Drop constraints
        await queryRunner.query(`
            ALTER TABLE event."TournamentEnrollments"
            DROP CONSTRAINT IF EXISTS "CHK_enrollment_source_valid"
        `);
        await queryRunner.query(`
            ALTER TABLE event."TournamentEnrollments"
            DROP CONSTRAINT IF EXISTS "CHK_waitlist_position_positive"
        `);
        await queryRunner.query(`
            ALTER TABLE event."TournamentEnrollments"
            DROP CONSTRAINT IF EXISTS "FK_enrollment_approved_by"
        `);
        await queryRunner.query(`
            ALTER TABLE event."TournamentEnrollments"
            DROP CONSTRAINT IF EXISTS "FK_enrollment_session"
        `);

        // Drop columns
        await queryRunner.query(`
            ALTER TABLE event."TournamentEnrollments"
            DROP COLUMN IF EXISTS "withdrawnAt",
            DROP COLUMN IF EXISTS "cancelledAt",
            DROP COLUMN IF EXISTS "confirmedAt",
            DROP COLUMN IF EXISTS "rejectionReason",
            DROP COLUMN IF EXISTS "approvedAt",
            DROP COLUMN IF EXISTS "approvedBy",
            DROP COLUMN IF EXISTS "requiresApproval",
            DROP COLUMN IF EXISTS "originalWaitingListPosition",
            DROP COLUMN IF EXISTS "promotedFromWaitingList",
            DROP COLUMN IF EXISTS "promotedAt",
            DROP COLUMN IF EXISTS "enrollmentSource",
            DROP COLUMN IF EXISTS "sessionId"
        `);

        console.log('Rollback completed.');
    }
}
