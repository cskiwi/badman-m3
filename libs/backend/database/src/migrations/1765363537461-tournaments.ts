import { MigrationInterface, QueryRunner } from "typeorm";

export class Tournaments1765363537461 implements MigrationInterface {
    name = 'Tournaments1765363537461'

    public async up(queryRunner: QueryRunner): Promise<void> {
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
            CREATE INDEX "IDX_14c8636b1865ead77d3c8ecd40" ON "event"."TournamentEnrollments" ("tournamentSubEventId")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_968182111deaba90a67406d1ef" ON "event"."TournamentEnrollments" ("playerId")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_bd31f7a207f950b87569674878" ON "event"."TournamentEnrollments" ("preferredPartnerId")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_7979dd73167e8a944b480fa3c2" ON "event"."TournamentEnrollments" ("confirmedPartnerId")
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_47282409934917f5c6e51b9c11" ON "event"."TournamentEnrollments" ("tournamentSubEventId", "playerId")
            WHERE "playerId" IS NOT NULL
        `);
        await queryRunner.query(`
            CREATE TYPE "event"."TournamentCheckIns_status_enum" AS ENUM('PENDING', 'CHECKED_IN', 'NO_SHOW')
        `);
        await queryRunner.query(`
            CREATE TABLE "event"."TournamentCheckIns" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "tournamentEventId" uuid NOT NULL,
                "enrollmentId" uuid NOT NULL,
                "checkedInAt" TIMESTAMP WITH TIME ZONE,
                "checkedInById" uuid,
                "status" "event"."TournamentCheckIns_status_enum" NOT NULL DEFAULT 'PENDING',
                "notes" text,
                CONSTRAINT "PK_f9a9bb065bde3e3b80daf2d1bad" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_1a7ab4e30745bffb5b4720ab01" ON "event"."TournamentCheckIns" ("tournamentEventId")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_55f5c44c0ea4ecbb3abfe91e8b" ON "event"."TournamentCheckIns" ("enrollmentId")
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_f8708de3ced79e4f02e6c8148e" ON "event"."TournamentCheckIns" ("tournamentEventId", "enrollmentId")
        `);
        await queryRunner.query(`
            CREATE TYPE "event"."TournamentScheduleSlots_status_enum" AS ENUM(
                'AVAILABLE',
                'SCHEDULED',
                'IN_PROGRESS',
                'COMPLETED',
                'BLOCKED'
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "event"."TournamentScheduleSlots" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "tournamentEventId" uuid NOT NULL,
                "courtId" uuid NOT NULL,
                "startTime" TIMESTAMP WITH TIME ZONE NOT NULL,
                "endTime" TIMESTAMP WITH TIME ZONE NOT NULL,
                "gameId" uuid,
                "status" "event"."TournamentScheduleSlots_status_enum" NOT NULL DEFAULT 'AVAILABLE',
                "order" integer NOT NULL DEFAULT '0',
                CONSTRAINT "REL_b813e18504b0b7c5487b0d9d41" UNIQUE ("gameId"),
                CONSTRAINT "PK_db6d8bfef146764bb314dd1a206" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_e7e275f27d8d3713491cc93fa6" ON "event"."TournamentScheduleSlots" ("tournamentEventId")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_0f7ab7d0169e9fdc662a1c2fc4" ON "event"."TournamentScheduleSlots" ("courtId")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_b813e18504b0b7c5487b0d9d41" ON "event"."TournamentScheduleSlots" ("gameId")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_99f0919f5ff84838b6fe8b15a9" ON "event"."TournamentScheduleSlots" ("tournamentEventId", "courtId", "startTime")
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EventTournaments"
            ADD "enrollmentOpenDate" TIMESTAMP WITH TIME ZONE
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EventTournaments"
            ADD "enrollmentCloseDate" TIMESTAMP WITH TIME ZONE
        `);
        await queryRunner.query(`
            CREATE TYPE "event"."EventTournaments_phase_enum" AS ENUM(
                'DRAFT',
                'ENROLLMENT_OPEN',
                'ENROLLMENT_CLOSED',
                'DRAWS_MADE',
                'SCHEDULED',
                'IN_PROGRESS',
                'COMPLETED'
            )
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EventTournaments"
            ADD "phase" "event"."EventTournaments_phase_enum" NOT NULL DEFAULT 'DRAFT'
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EventTournaments"
            ADD "allowGuestEnrollments" boolean NOT NULL DEFAULT false
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EventTournaments"
            ADD "schedulePublished" boolean NOT NULL DEFAULT false
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."SubEventTournaments"
            ADD "waitingListEnabled" boolean NOT NULL DEFAULT true
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."Entries"
            ADD "enrollmentId" uuid
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."Entries"
            ADD "seed" integer
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."Games"
            ADD "scheduledTime" TIMESTAMP WITH TIME ZONE
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."Games"
            ADD "actualStartTime" TIMESTAMP WITH TIME ZONE
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."Games"
            ADD "actualEndTime" TIMESTAMP WITH TIME ZONE
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."Games"
            ADD "scheduleSlotId" uuid
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."Locations"
            ALTER COLUMN "coordinates" TYPE geometry
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_4b3f72460465180c38122f18a5" ON "event"."Entries" ("enrollmentId")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_9a23adbc98da391388a0f76723" ON "event"."Games" ("scheduleSlotId")
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."TournamentEnrollments"
            ADD CONSTRAINT "FK_14c8636b1865ead77d3c8ecd40b" FOREIGN KEY ("tournamentSubEventId") REFERENCES "event"."SubEventTournaments"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."TournamentEnrollments"
            ADD CONSTRAINT "FK_968182111deaba90a67406d1ef3" FOREIGN KEY ("playerId") REFERENCES "Players"("id") ON DELETE
            SET NULL ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."TournamentEnrollments"
            ADD CONSTRAINT "FK_bd31f7a207f950b875696748787" FOREIGN KEY ("preferredPartnerId") REFERENCES "Players"("id") ON DELETE
            SET NULL ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."TournamentEnrollments"
            ADD CONSTRAINT "FK_7979dd73167e8a944b480fa3c23" FOREIGN KEY ("confirmedPartnerId") REFERENCES "Players"("id") ON DELETE
            SET NULL ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."TournamentCheckIns"
            ADD CONSTRAINT "FK_1a7ab4e30745bffb5b4720ab01b" FOREIGN KEY ("tournamentEventId") REFERENCES "event"."EventTournaments"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."TournamentCheckIns"
            ADD CONSTRAINT "FK_55f5c44c0ea4ecbb3abfe91e8b5" FOREIGN KEY ("enrollmentId") REFERENCES "event"."TournamentEnrollments"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."TournamentCheckIns"
            ADD CONSTRAINT "FK_8ad50e732de0990b46804bb564e" FOREIGN KEY ("checkedInById") REFERENCES "Players"("id") ON DELETE
            SET NULL ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."TournamentScheduleSlots"
            ADD CONSTRAINT "FK_e7e275f27d8d3713491cc93fa61" FOREIGN KEY ("tournamentEventId") REFERENCES "event"."EventTournaments"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."TournamentScheduleSlots"
            ADD CONSTRAINT "FK_0f7ab7d0169e9fdc662a1c2fc4e" FOREIGN KEY ("courtId") REFERENCES "event"."Courts"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."TournamentScheduleSlots"
            ADD CONSTRAINT "FK_b813e18504b0b7c5487b0d9d41c" FOREIGN KEY ("gameId") REFERENCES "event"."Games"("id") ON DELETE
            SET NULL ON UPDATE NO ACTION
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
            ALTER TABLE "event"."TournamentScheduleSlots" DROP CONSTRAINT "FK_b813e18504b0b7c5487b0d9d41c"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."TournamentScheduleSlots" DROP CONSTRAINT "FK_0f7ab7d0169e9fdc662a1c2fc4e"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."TournamentScheduleSlots" DROP CONSTRAINT "FK_e7e275f27d8d3713491cc93fa61"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."TournamentCheckIns" DROP CONSTRAINT "FK_8ad50e732de0990b46804bb564e"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."TournamentCheckIns" DROP CONSTRAINT "FK_55f5c44c0ea4ecbb3abfe91e8b5"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."TournamentCheckIns" DROP CONSTRAINT "FK_1a7ab4e30745bffb5b4720ab01b"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."TournamentEnrollments" DROP CONSTRAINT "FK_7979dd73167e8a944b480fa3c23"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."TournamentEnrollments" DROP CONSTRAINT "FK_bd31f7a207f950b875696748787"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."TournamentEnrollments" DROP CONSTRAINT "FK_968182111deaba90a67406d1ef3"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."TournamentEnrollments" DROP CONSTRAINT "FK_14c8636b1865ead77d3c8ecd40b"
        `);
        await queryRunner.query(`
            DROP INDEX "event"."IDX_9a23adbc98da391388a0f76723"
        `);
        await queryRunner.query(`
            DROP INDEX "event"."IDX_4b3f72460465180c38122f18a5"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."Locations"
            ALTER COLUMN "coordinates" TYPE geometry(GEOMETRY, 0)
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."Games" DROP COLUMN "scheduleSlotId"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."Games" DROP COLUMN "actualEndTime"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."Games" DROP COLUMN "actualStartTime"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."Games" DROP COLUMN "scheduledTime"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."Entries" DROP COLUMN "seed"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."Entries" DROP COLUMN "enrollmentId"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."SubEventTournaments" DROP COLUMN "waitingListEnabled"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EventTournaments" DROP COLUMN "schedulePublished"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EventTournaments" DROP COLUMN "allowGuestEnrollments"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EventTournaments" DROP COLUMN "phase"
        `);
        await queryRunner.query(`
            DROP TYPE "event"."EventTournaments_phase_enum"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EventTournaments" DROP COLUMN "enrollmentCloseDate"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EventTournaments" DROP COLUMN "enrollmentOpenDate"
        `);
        await queryRunner.query(`
            DROP INDEX "event"."IDX_99f0919f5ff84838b6fe8b15a9"
        `);
        await queryRunner.query(`
            DROP INDEX "event"."IDX_b813e18504b0b7c5487b0d9d41"
        `);
        await queryRunner.query(`
            DROP INDEX "event"."IDX_0f7ab7d0169e9fdc662a1c2fc4"
        `);
        await queryRunner.query(`
            DROP INDEX "event"."IDX_e7e275f27d8d3713491cc93fa6"
        `);
        await queryRunner.query(`
            DROP TABLE "event"."TournamentScheduleSlots"
        `);
        await queryRunner.query(`
            DROP TYPE "event"."TournamentScheduleSlots_status_enum"
        `);
        await queryRunner.query(`
            DROP INDEX "event"."IDX_f8708de3ced79e4f02e6c8148e"
        `);
        await queryRunner.query(`
            DROP INDEX "event"."IDX_55f5c44c0ea4ecbb3abfe91e8b"
        `);
        await queryRunner.query(`
            DROP INDEX "event"."IDX_1a7ab4e30745bffb5b4720ab01"
        `);
        await queryRunner.query(`
            DROP TABLE "event"."TournamentCheckIns"
        `);
        await queryRunner.query(`
            DROP TYPE "event"."TournamentCheckIns_status_enum"
        `);
        await queryRunner.query(`
            DROP INDEX "event"."IDX_47282409934917f5c6e51b9c11"
        `);
        await queryRunner.query(`
            DROP INDEX "event"."IDX_7979dd73167e8a944b480fa3c2"
        `);
        await queryRunner.query(`
            DROP INDEX "event"."IDX_bd31f7a207f950b87569674878"
        `);
        await queryRunner.query(`
            DROP INDEX "event"."IDX_968182111deaba90a67406d1ef"
        `);
        await queryRunner.query(`
            DROP INDEX "event"."IDX_14c8636b1865ead77d3c8ecd40"
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
    }

}
