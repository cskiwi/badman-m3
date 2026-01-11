import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTournamentEventIdToEnrollmentSessions1768129708682 implements MigrationInterface {
    name = 'AddTournamentEventIdToEnrollmentSessions1768129708682'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "event"."EnrollmentSessionItems" DROP CONSTRAINT "EnrollmentSessionItems_preferredPartnerId_fkey"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EnrollmentSessionItems" DROP CONSTRAINT "EnrollmentSessionItems_sessionId_fkey"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EnrollmentSessionItems" DROP CONSTRAINT "EnrollmentSessionItems_tournamentSubEventId_fkey"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EnrollmentSessions" DROP CONSTRAINT "EnrollmentSessions_playerId_fkey"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EnrollmentSessions" DROP CONSTRAINT "FK_enrollment_sessions_tournament"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."TournamentEnrollments" DROP CONSTRAINT "FK_enrollment_approved_by"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."TournamentEnrollments" DROP CONSTRAINT "FK_enrollment_session"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."WaitingListLogs" DROP CONSTRAINT "WaitingListLogs_enrollmentId_fkey"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."WaitingListLogs" DROP CONSTRAINT "WaitingListLogs_tournamentSubEventId_fkey"
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."RoleClaimMemberships" DROP CONSTRAINT "FK_c58a3fa6f0cf3e39415fb8c921e"
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."RoleClaimMemberships" DROP CONSTRAINT "FK_ff730a10bb49aa72b3970ad9f02"
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."PlayerClaimMemberships" DROP CONSTRAINT "FK_4e01a9879a5374db2acd070d672"
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."PlayerClaimMemberships" DROP CONSTRAINT "FK_a03d57401ba2f731457db73a67a"
        `);
        await queryRunner.query(`
            DROP INDEX "event"."IDX_subevent_enrollment_phase"
        `);
        await queryRunner.query(`
            DROP INDEX "event"."IDX_subevent_enrollment_dates"
        `);
        await queryRunner.query(`
            DROP INDEX "event"."IDX_subevent_capacity"
        `);
        await queryRunner.query(`
            DROP INDEX "event"."IDX_session_items_subevent"
        `);
        await queryRunner.query(`
            DROP INDEX "event"."IDX_session_items_validation"
        `);
        await queryRunner.query(`
            DROP INDEX "event"."IDX_session_items_session"
        `);
        await queryRunner.query(`
            DROP INDEX "event"."IDX_enrollment_sessions_player"
        `);
        await queryRunner.query(`
            DROP INDEX "event"."IDX_enrollment_sessions_status"
        `);
        await queryRunner.query(`
            DROP INDEX "event"."IDX_enrollment_sessions_expires"
        `);
        await queryRunner.query(`
            DROP INDEX "event"."IDX_enrollment_sessions_created"
        `);
        await queryRunner.query(`
            DROP INDEX "event"."IDX_enrollment_sessions_tournament"
        `);
        await queryRunner.query(`
            DROP INDEX "event"."IDX_enrollment_player_status"
        `);
        await queryRunner.query(`
            DROP INDEX "event"."IDX_enrollment_subevent_status"
        `);
        await queryRunner.query(`
            DROP INDEX "event"."IDX_enrollment_waitlist"
        `);
        await queryRunner.query(`
            DROP INDEX "event"."IDX_enrollment_source"
        `);
        await queryRunner.query(`
            DROP INDEX "event"."IDX_enrollment_session"
        `);
        await queryRunner.query(`
            DROP INDEX "event"."IDX_enrollment_confirmed_at"
        `);
        await queryRunner.query(`
            DROP INDEX "event"."IDX_enrollment_promoted"
        `);
        await queryRunner.query(`
            DROP INDEX "event"."IDX_enrollment_requires_approval"
        `);
        await queryRunner.query(`
            DROP INDEX "event"."IDX_waitlist_log_enrollment"
        `);
        await queryRunner.query(`
            DROP INDEX "event"."IDX_waitlist_log_subevent"
        `);
        await queryRunner.query(`
            DROP INDEX "event"."IDX_waitlist_log_created"
        `);
        await queryRunner.query(`
            DROP INDEX "event"."IDX_waitlist_log_action"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."SubEventTournaments" DROP CONSTRAINT "CHK_enrollment_phase"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."SubEventTournaments" DROP CONSTRAINT "CHK_max_entries_positive"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."SubEventTournaments" DROP CONSTRAINT "CHK_enrollment_count_valid"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EnrollmentSessions" DROP CONSTRAINT "CHK_expires_future"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."TournamentEnrollments" DROP CONSTRAINT "CHK_waitlist_position_positive"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."TournamentEnrollments" DROP CONSTRAINT "CHK_enrollment_source_valid"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EnrollmentSessionItems" DROP CONSTRAINT "UQ_session_subevent"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."SubEventTournaments"
            ALTER COLUMN "enrollmentPhase"
            SET NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."SubEventTournaments"
            ALTER COLUMN "currentEnrollmentCount"
            SET NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."SubEventTournaments"
            ALTER COLUMN "confirmedEnrollmentCount"
            SET NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."SubEventTournaments"
            ALTER COLUMN "autoPromoteFromWaitingList"
            SET NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."SubEventTournaments"
            ALTER COLUMN "requiresApproval"
            SET NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."SubEventTournaments"
            ALTER COLUMN "allowGuestEnrollments"
            SET NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EnrollmentSessionItems"
            ALTER COLUMN "isGuestEnrollment"
            SET NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EnrollmentSessionItems"
            ALTER COLUMN "validationStatus"
            SET NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EnrollmentSessions"
            ALTER COLUMN "totalSubEvents"
            SET NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."TournamentEnrollments"
            ALTER COLUMN "enrollmentSource"
            SET NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."TournamentEnrollments"
            ALTER COLUMN "promotedFromWaitingList"
            SET NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."TournamentEnrollments"
            ALTER COLUMN "requiresApproval"
            SET NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."Locations"
            ALTER COLUMN "coordinates" TYPE geometry
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EnrollmentSessionItems"
            ADD CONSTRAINT "FK_bc1e0953738eeead29b5af1ae6f" FOREIGN KEY ("sessionId") REFERENCES "event"."EnrollmentSessions"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EnrollmentSessionItems"
            ADD CONSTRAINT "FK_21ee11b1ccbae0884705fe50fe3" FOREIGN KEY ("tournamentSubEventId") REFERENCES "event"."SubEventTournaments"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EnrollmentSessionItems"
            ADD CONSTRAINT "FK_c48d209e07ca18799e36339d30d" FOREIGN KEY ("preferredPartnerId") REFERENCES "Players"("id") ON DELETE
            SET NULL ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EnrollmentSessions"
            ADD CONSTRAINT "FK_2b0154230ffeaa2074702a481d1" FOREIGN KEY ("playerId") REFERENCES "Players"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EnrollmentSessions"
            ADD CONSTRAINT "FK_46ad60e62c4ea0152aa9bd1fa56" FOREIGN KEY ("tournamentEventId") REFERENCES "event"."EventTournaments"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."TournamentEnrollments"
            ADD CONSTRAINT "FK_2ceed0a643f53f587a1d00c88a0" FOREIGN KEY ("approvedBy") REFERENCES "Players"("id") ON DELETE
            SET NULL ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."WaitingListLogs"
            ADD CONSTRAINT "FK_abf6ff4c1e02f84216039fe18fc" FOREIGN KEY ("enrollmentId") REFERENCES "event"."TournamentEnrollments"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."WaitingListLogs"
            ADD CONSTRAINT "FK_8be5090375f0da707caa6b879e4" FOREIGN KEY ("tournamentSubEventId") REFERENCES "event"."SubEventTournaments"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."PlayerClaimMemberships"
            ADD CONSTRAINT "FK_4e01a9879a5374db2acd070d672" FOREIGN KEY ("claimId") REFERENCES "security"."Claims"("id") ON DELETE CASCADE ON UPDATE CASCADE
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."PlayerClaimMemberships"
            ADD CONSTRAINT "FK_a03d57401ba2f731457db73a67a" FOREIGN KEY ("playerId") REFERENCES "Players"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."RoleClaimMemberships"
            ADD CONSTRAINT "FK_ff730a10bb49aa72b3970ad9f02" FOREIGN KEY ("claimId") REFERENCES "security"."Claims"("id") ON DELETE CASCADE ON UPDATE CASCADE
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."RoleClaimMemberships"
            ADD CONSTRAINT "FK_c58a3fa6f0cf3e39415fb8c921e" FOREIGN KEY ("roleId") REFERENCES "security"."Roles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "security"."RoleClaimMemberships" DROP CONSTRAINT "FK_c58a3fa6f0cf3e39415fb8c921e"
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."RoleClaimMemberships" DROP CONSTRAINT "FK_ff730a10bb49aa72b3970ad9f02"
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."PlayerClaimMemberships" DROP CONSTRAINT "FK_a03d57401ba2f731457db73a67a"
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."PlayerClaimMemberships" DROP CONSTRAINT "FK_4e01a9879a5374db2acd070d672"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."WaitingListLogs" DROP CONSTRAINT "FK_8be5090375f0da707caa6b879e4"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."WaitingListLogs" DROP CONSTRAINT "FK_abf6ff4c1e02f84216039fe18fc"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."TournamentEnrollments" DROP CONSTRAINT "FK_2ceed0a643f53f587a1d00c88a0"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EnrollmentSessions" DROP CONSTRAINT "FK_46ad60e62c4ea0152aa9bd1fa56"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EnrollmentSessions" DROP CONSTRAINT "FK_2b0154230ffeaa2074702a481d1"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EnrollmentSessionItems" DROP CONSTRAINT "FK_c48d209e07ca18799e36339d30d"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EnrollmentSessionItems" DROP CONSTRAINT "FK_21ee11b1ccbae0884705fe50fe3"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EnrollmentSessionItems" DROP CONSTRAINT "FK_bc1e0953738eeead29b5af1ae6f"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."Locations"
            ALTER COLUMN "coordinates" TYPE geometry(GEOMETRY, 0)
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."TournamentEnrollments"
            ALTER COLUMN "requiresApproval" DROP NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."TournamentEnrollments"
            ALTER COLUMN "promotedFromWaitingList" DROP NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."TournamentEnrollments"
            ALTER COLUMN "enrollmentSource" DROP NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EnrollmentSessions"
            ALTER COLUMN "totalSubEvents" DROP NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EnrollmentSessionItems"
            ALTER COLUMN "validationStatus" DROP NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EnrollmentSessionItems"
            ALTER COLUMN "isGuestEnrollment" DROP NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."SubEventTournaments"
            ALTER COLUMN "allowGuestEnrollments" DROP NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."SubEventTournaments"
            ALTER COLUMN "requiresApproval" DROP NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."SubEventTournaments"
            ALTER COLUMN "autoPromoteFromWaitingList" DROP NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."SubEventTournaments"
            ALTER COLUMN "confirmedEnrollmentCount" DROP NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."SubEventTournaments"
            ALTER COLUMN "currentEnrollmentCount" DROP NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."SubEventTournaments"
            ALTER COLUMN "enrollmentPhase" DROP NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EnrollmentSessionItems"
            ADD CONSTRAINT "UQ_session_subevent" UNIQUE ("sessionId", "tournamentSubEventId")
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."TournamentEnrollments"
            ADD CONSTRAINT "CHK_enrollment_source_valid" CHECK (
                    (
                        ("enrollmentSource")::text = ANY (
                            (
                                ARRAY ['MANUAL'::character varying, 'PUBLIC_FORM'::character varying, 'IMPORT'::character varying, 'AUTO_PROMOTED'::character varying]
                            )::text []
                        )
                    )
                )
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."TournamentEnrollments"
            ADD CONSTRAINT "CHK_waitlist_position_positive" CHECK (
                    (
                        ("waitingListPosition" IS NULL)
                        OR ("waitingListPosition" > 0)
                    )
                )
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EnrollmentSessions"
            ADD CONSTRAINT "CHK_expires_future" CHECK (("expiresAt" > "createdAt"))
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."SubEventTournaments"
            ADD CONSTRAINT "CHK_enrollment_count_valid" CHECK (
                    (
                        ("currentEnrollmentCount" >= 0)
                        AND (
                            ("maxEntries" IS NULL)
                            OR (
                                "currentEnrollmentCount" <= ("maxEntries" + COALESCE("maxWaitingListSize", 0))
                            )
                        )
                    )
                )
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."SubEventTournaments"
            ADD CONSTRAINT "CHK_max_entries_positive" CHECK (
                    (
                        ("maxEntries" IS NULL)
                        OR ("maxEntries" > 0)
                    )
                )
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."SubEventTournaments"
            ADD CONSTRAINT "CHK_enrollment_phase" CHECK (
                    (
                        ("enrollmentPhase")::text = ANY (
                            (
                                ARRAY ['DRAFT'::character varying, 'OPEN'::character varying, 'CLOSED'::character varying, 'WAITLIST_ONLY'::character varying, 'FULL'::character varying, 'LOCKED'::character varying]
                            )::text []
                        )
                    )
                )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_waitlist_log_action" ON "event"."WaitingListLogs" ("createdAt", "action")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_waitlist_log_created" ON "event"."WaitingListLogs" ("createdAt")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_waitlist_log_subevent" ON "event"."WaitingListLogs" ("tournamentSubEventId")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_waitlist_log_enrollment" ON "event"."WaitingListLogs" ("enrollmentId")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_enrollment_requires_approval" ON "event"."TournamentEnrollments" ("requiresApproval", "approvedAt")
            WHERE ("requiresApproval" = true)
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_enrollment_promoted" ON "event"."TournamentEnrollments" ("promotedAt", "promotedFromWaitingList")
            WHERE ("promotedFromWaitingList" = true)
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_enrollment_confirmed_at" ON "event"."TournamentEnrollments" ("confirmedAt")
            WHERE ("confirmedAt" IS NOT NULL)
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_enrollment_session" ON "event"."TournamentEnrollments" ("sessionId")
            WHERE ("sessionId" IS NOT NULL)
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_enrollment_source" ON "event"."TournamentEnrollments" ("createdAt", "enrollmentSource")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_enrollment_waitlist" ON "event"."TournamentEnrollments" ("tournamentSubEventId", "waitingListPosition")
            WHERE (
                    (
                        status = 'WAITING_LIST'::event."TournamentEnrollments_status_enum"
                    )
                    AND ("waitingListPosition" IS NOT NULL)
                )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_enrollment_subevent_status" ON "event"."TournamentEnrollments" ("tournamentSubEventId", "status")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_enrollment_player_status" ON "event"."TournamentEnrollments" ("playerId", "status")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_enrollment_sessions_tournament" ON "event"."EnrollmentSessions" ("status", "tournamentEventId")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_enrollment_sessions_created" ON "event"."EnrollmentSessions" ("createdAt")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_enrollment_sessions_expires" ON "event"."EnrollmentSessions" ("expiresAt")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_enrollment_sessions_status" ON "event"."EnrollmentSessions" ("status")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_enrollment_sessions_player" ON "event"."EnrollmentSessions" ("playerId")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_session_items_session" ON "event"."EnrollmentSessionItems" ("sessionId")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_session_items_validation" ON "event"."EnrollmentSessionItems" ("validationStatus")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_session_items_subevent" ON "event"."EnrollmentSessionItems" ("tournamentSubEventId")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_subevent_capacity" ON "event"."SubEventTournaments" ("maxEntries", "currentEnrollmentCount")
            WHERE ("maxEntries" IS NOT NULL)
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_subevent_enrollment_dates" ON "event"."SubEventTournaments" ("enrollmentOpenDate", "enrollmentCloseDate")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_subevent_enrollment_phase" ON "event"."SubEventTournaments" ("eventId", "enrollmentPhase")
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."PlayerClaimMemberships"
            ADD CONSTRAINT "FK_a03d57401ba2f731457db73a67a" FOREIGN KEY ("playerId") REFERENCES "Players"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."PlayerClaimMemberships"
            ADD CONSTRAINT "FK_4e01a9879a5374db2acd070d672" FOREIGN KEY ("claimId") REFERENCES "security"."Claims"("id") ON DELETE CASCADE ON UPDATE CASCADE
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."RoleClaimMemberships"
            ADD CONSTRAINT "FK_ff730a10bb49aa72b3970ad9f02" FOREIGN KEY ("claimId") REFERENCES "security"."Claims"("id") ON DELETE CASCADE ON UPDATE CASCADE
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."RoleClaimMemberships"
            ADD CONSTRAINT "FK_c58a3fa6f0cf3e39415fb8c921e" FOREIGN KEY ("roleId") REFERENCES "security"."Roles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."WaitingListLogs"
            ADD CONSTRAINT "WaitingListLogs_tournamentSubEventId_fkey" FOREIGN KEY ("tournamentSubEventId") REFERENCES "event"."SubEventTournaments"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."WaitingListLogs"
            ADD CONSTRAINT "WaitingListLogs_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "event"."TournamentEnrollments"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."TournamentEnrollments"
            ADD CONSTRAINT "FK_enrollment_session" FOREIGN KEY ("sessionId") REFERENCES "event"."EnrollmentSessions"("id") ON DELETE
            SET NULL ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."TournamentEnrollments"
            ADD CONSTRAINT "FK_enrollment_approved_by" FOREIGN KEY ("approvedBy") REFERENCES "Players"("id") ON DELETE
            SET NULL ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EnrollmentSessions"
            ADD CONSTRAINT "FK_enrollment_sessions_tournament" FOREIGN KEY ("tournamentEventId") REFERENCES "event"."EventTournaments"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EnrollmentSessions"
            ADD CONSTRAINT "EnrollmentSessions_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Players"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EnrollmentSessionItems"
            ADD CONSTRAINT "EnrollmentSessionItems_tournamentSubEventId_fkey" FOREIGN KEY ("tournamentSubEventId") REFERENCES "event"."SubEventTournaments"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EnrollmentSessionItems"
            ADD CONSTRAINT "EnrollmentSessionItems_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "event"."EnrollmentSessions"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EnrollmentSessionItems"
            ADD CONSTRAINT "EnrollmentSessionItems_preferredPartnerId_fkey" FOREIGN KEY ("preferredPartnerId") REFERENCES "Players"("id") ON DELETE
            SET NULL ON UPDATE NO ACTION
        `);
    }

}
