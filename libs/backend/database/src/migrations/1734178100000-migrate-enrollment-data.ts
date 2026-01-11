import { MigrationInterface, QueryRunner } from "typeorm";

export class MigrateEnrollmentData1734178100000 implements MigrationInterface {
    name = 'MigrateEnrollmentData1734178100000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // ===================================================================
        // DATA MIGRATION: Migrate tournament-level settings to sub-events
        // ===================================================================

        console.log('Migrating enrollment data from tournament to sub-event level...');

        // Step 1: Inherit tournament-level enrollment dates and settings
        await queryRunner.query(`
            UPDATE event."SubEventTournaments" se
            SET
                "enrollmentOpenDate" = te."enrollmentOpenDate",
                "enrollmentCloseDate" = te."enrollmentCloseDate",
                "allowGuestEnrollments" = te."allowGuestEnrollments",
                "enrollmentPhase" = CASE
                    WHEN te."phase" = 'DRAFT' THEN 'DRAFT'
                    WHEN te."phase" = 'ENROLLMENT_OPEN' THEN 'OPEN'
                    WHEN te."phase" IN ('ENROLLMENT_CLOSED', 'DRAWS_MADE', 'SCHEDULED', 'IN_PROGRESS') THEN 'CLOSED'
                    WHEN te."phase" = 'COMPLETED' THEN 'LOCKED'
                    ELSE 'DRAFT'
                END
            FROM event."EventTournaments" te
            WHERE se."eventId" = te."id"
        `);

        console.log('Calculating current enrollment counts...');

        // Step 2: Calculate current enrollment counts for all sub-events
        await queryRunner.query(`
            UPDATE event."SubEventTournaments" se
            SET
                "currentEnrollmentCount" = COALESCE(counts.total_count, 0),
                "confirmedEnrollmentCount" = COALESCE(counts.confirmed_count, 0)
            FROM (
                SELECT
                    e."tournamentSubEventId",
                    COUNT(*) FILTER (WHERE e."status" IN ('PENDING', 'CONFIRMED', 'WAITING_LIST')) as total_count,
                    COUNT(*) FILTER (WHERE e."status" = 'CONFIRMED') as confirmed_count
                FROM event."TournamentEnrollments" e
                GROUP BY e."tournamentSubEventId"
            ) counts
            WHERE se."id" = counts."tournamentSubEventId"
        `);

        // Step 3: Set enrollment phase to FULL for events that have reached capacity
        await queryRunner.query(`
            UPDATE event."SubEventTournaments"
            SET "enrollmentPhase" = 'FULL'
            WHERE "maxEntries" IS NOT NULL
              AND "currentEnrollmentCount" >= "maxEntries"
              AND "enrollmentPhase" = 'OPEN'
        `);

        // Step 4: Set enrollment phase to WAITLIST_ONLY for events slightly over capacity
        // (this handles the case where waiting list is enabled but event is full)
        await queryRunner.query(`
            UPDATE event."SubEventTournaments"
            SET "enrollmentPhase" = 'WAITLIST_ONLY'
            WHERE "maxEntries" IS NOT NULL
              AND "currentEnrollmentCount" >= "maxEntries"
              AND "waitingListEnabled" = true
              AND "enrollmentPhase" IN ('OPEN', 'FULL')
              AND EXISTS (
                SELECT 1 FROM event."TournamentEnrollments" e
                WHERE e."tournamentSubEventId" = "SubEventTournaments"."id"
                  AND e."status" = 'WAITING_LIST'
              )
        `);

        // Step 5: Normalize waiting list positions (ensure sequential numbering)
        console.log('Normalizing waiting list positions...');

        await queryRunner.query(`
            WITH ranked_waitlist AS (
                SELECT
                    e."id",
                    ROW_NUMBER() OVER (
                        PARTITION BY e."tournamentSubEventId"
                        ORDER BY COALESCE(e."waitingListPosition", 999999), e."createdAt"
                    ) as new_position
                FROM event."TournamentEnrollments" e
                WHERE e."status" = 'WAITING_LIST'
            )
            UPDATE event."TournamentEnrollments" e
            SET "waitingListPosition" = rw.new_position
            FROM ranked_waitlist rw
            WHERE e."id" = rw."id"
        `);

        // Step 6: Log current state for verification
        const subEventStats = await queryRunner.query(`
            SELECT
                te."name" as tournament_name,
                se."name" as subevent_name,
                se."enrollmentPhase",
                se."maxEntries",
                se."currentEnrollmentCount",
                se."confirmedEnrollmentCount",
                COUNT(*) FILTER (WHERE e."status" = 'WAITING_LIST') as waiting_list_count
            FROM event."SubEventTournaments" se
            JOIN event."EventTournaments" te ON se."eventId" = te."id"
            LEFT JOIN event."TournamentEnrollments" e ON e."tournamentSubEventId" = se."id"
            GROUP BY te."name", se."name", se."enrollmentPhase", se."maxEntries",
                     se."currentEnrollmentCount", se."confirmedEnrollmentCount"
            ORDER BY te."name", se."name"
        `);

        console.log('Migration summary:');
        console.log(`Migrated ${subEventStats.length} sub-events`);

        // Count by phase
        const phaseCounts = await queryRunner.query(`
            SELECT "enrollmentPhase", COUNT(*) as count
            FROM event."SubEventTournaments"
            GROUP BY "enrollmentPhase"
            ORDER BY "enrollmentPhase"
        `);

        console.log('Sub-events by phase:');
        phaseCounts.forEach((row: { enrollmentPhase: string; count: string }) => {
            console.log(`  ${row.enrollmentPhase}: ${row.count}`);
        });

        // Verify data integrity
        console.log('Verifying data integrity...');

        const integrityCheck = await queryRunner.query(`
            SELECT
                COUNT(*) FILTER (
                    WHERE "currentEnrollmentCount" < 0
                ) as negative_counts,
                COUNT(*) FILTER (
                    WHERE "maxEntries" IS NOT NULL AND "currentEnrollmentCount" > "maxEntries" + 100
                ) as excessive_counts,
                COUNT(*) FILTER (
                    WHERE "confirmedEnrollmentCount" > "currentEnrollmentCount"
                ) as invalid_confirmed_counts
            FROM event."SubEventTournaments"
        `);

        if (integrityCheck[0].negative_counts > 0 ||
            integrityCheck[0].excessive_counts > 0 ||
            integrityCheck[0].invalid_confirmed_counts > 0) {
            console.warn('WARNING: Data integrity issues detected:');
            console.warn(`  Negative counts: ${integrityCheck[0].negative_counts}`);
            console.warn(`  Excessive counts: ${integrityCheck[0].excessive_counts}`);
            console.warn(`  Invalid confirmed counts: ${integrityCheck[0].invalid_confirmed_counts}`);
            console.warn('Please review the data before proceeding.');
        } else {
            console.log('Data integrity check passed.');
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Reset sub-event enrollment data to default state
        console.log('Rolling back enrollment data migration...');

        await queryRunner.query(`
            UPDATE event."SubEventTournaments"
            SET
                "enrollmentOpenDate" = NULL,
                "enrollmentCloseDate" = NULL,
                "enrollmentPhase" = 'DRAFT',
                "currentEnrollmentCount" = 0,
                "confirmedEnrollmentCount" = 0,
                "allowGuestEnrollments" = true
        `);

        console.log('Enrollment data migration rolled back.');
    }
}
