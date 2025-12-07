import { MigrationInterface, QueryRunner } from "typeorm";

export class SomeIndiciesForEncounters1764957881342 implements MigrationInterface {
    name = 'SomeIndiciesForEncounters1764957881342'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "event"."LocationEventTournaments" DROP CONSTRAINT "LocationEventTournaments_eventId_fkey"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."LocationEventTournaments" DROP CONSTRAINT "LocationEventTournaments_locationId_fkey"
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."PlayerClaimMemberships" DROP CONSTRAINT "FK_4e01a9879a5374db2acd070d672"
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."RoleClaimMemberships" DROP CONSTRAINT "FK_ff730a10bb49aa72b3970ad9f02"
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."RoleClaimMemberships" DROP CONSTRAINT "FK_c58a3fa6f0cf3e39415fb8c921e"
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."PlayerRoleMemberships" DROP CONSTRAINT "FK_d3e4951d21386ee72a663eeec58"
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."PlayerClaimMemberships" DROP CONSTRAINT "FK_a03d57401ba2f731457db73a67a"
        `);
        await queryRunner.query(`
            CREATE TABLE "TournamentGroupSubEventMemberships" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "groupId" uuid NOT NULL,
                "subEventId" uuid NOT NULL,
                "sortOrder" integer NOT NULL DEFAULT '0',
                "isActive" boolean NOT NULL DEFAULT true,
                CONSTRAINT "PK_664abb03628d8bbfeee83709a5e" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_018fdde998a631c799bdb2af6f" ON "TournamentGroupSubEventMemberships" ("groupId")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_0a911c701df45ba8c9b48f6198" ON "TournamentGroupSubEventMemberships" ("subEventId")
        `);
        await queryRunner.query(`
            CREATE TABLE "CompetitionGroupSubEventMemberships" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "groupId" uuid NOT NULL,
                "subEventId" uuid NOT NULL,
                "sortOrder" integer NOT NULL DEFAULT '0',
                "isActive" boolean NOT NULL DEFAULT true,
                CONSTRAINT "PK_91965be9bc4aa7fa8a0d8138709" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_d40d473e5fcf75b78a0d0d9aa7" ON "CompetitionGroupSubEventMemberships" ("groupId")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_4310511198480557ffc7459ff9" ON "CompetitionGroupSubEventMemberships" ("subEventId")
        `);
        await queryRunner.query(`
            CREATE TABLE "ImportFiles" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "filename" character varying(255) NOT NULL,
                "originalName" character varying(255) NOT NULL,
                "mimeType" character varying(255) NOT NULL,
                "size" bigint NOT NULL,
                "path" character varying(255) NOT NULL,
                "importType" character varying(255) NOT NULL,
                "status" character varying(255) NOT NULL DEFAULT 'pending',
                "processedAt" TIMESTAMP WITH TIME ZONE,
                "totalRecords" integer,
                "processedRecords" integer,
                "successfulRecords" integer,
                "failedRecords" integer,
                "errorLog" text,
                "uploadedBy" uuid,
                CONSTRAINT "PK_7fc7d015d2e26e3f723673ec6c9" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_bb0519dfd42075f6fb16158e49" ON "ImportFiles" ("filename")
        `);
        await queryRunner.query(`
            CREATE TABLE "CronJobs" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "name" character varying(255) NOT NULL,
                "description" character varying(255),
                "cronExpression" character varying(255) NOT NULL,
                "jobFunction" character varying(255) NOT NULL,
                "parameters" json,
                "isActive" boolean NOT NULL DEFAULT true,
                "lastRun" TIMESTAMP WITH TIME ZONE,
                "nextRun" TIMESTAMP WITH TIME ZONE,
                "lastStatus" character varying(255),
                "lastError" text,
                "runCount" integer NOT NULL DEFAULT '0',
                "failureCount" integer NOT NULL DEFAULT '0',
                CONSTRAINT "PK_1bc077df052c4342763f05595b3" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_1579c5f8a9dac83109f345d567" ON "CronJobs" ("name")
        `);
        await queryRunner.query(`
            CREATE TABLE "LogEntries" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "level" character varying(255) NOT NULL,
                "message" text NOT NULL,
                "category" character varying(255),
                "playerId" uuid,
                "requestId" uuid,
                "userAgent" character varying(255),
                "ipAddress" character varying(255),
                "method" character varying(255),
                "url" character varying(255),
                "statusCode" integer,
                "metadata" json,
                "stackTrace" text,
                CONSTRAINT "PK_f4d8de4bd1307f34370b81afb00" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_569106f7a14b34bbbda6784721" ON "LogEntries" ("createdAt")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_34ebd9f22d8e5381942a393562" ON "LogEntries" ("level")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_68a614f735c057f86c53639f98" ON "LogEntries" ("message")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_e87c2388e21aa0be3f1f3275f6" ON "LogEntries" ("category")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_b25e69de231068af52d37764b4" ON "LogEntries" ("playerId")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_a8508a1eb452186da26aeb31e0" ON "LogEntries" ("requestId")
        `);
        await queryRunner.query(`
            CREATE TABLE "Rules" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "name" character varying(255) NOT NULL,
                "description" character varying(255),
                "ruleType" character varying(255) NOT NULL,
                "scope" character varying(255) NOT NULL,
                "conditions" json,
                "actions" json,
                "isActive" boolean NOT NULL DEFAULT true,
                "priority" integer NOT NULL DEFAULT '0',
                "validFrom" TIMESTAMP WITH TIME ZONE,
                "validTo" TIMESTAMP WITH TIME ZONE,
                "createdBy" uuid,
                "lastModifiedBy" uuid,
                CONSTRAINT "PK_6b3823a21cc6c08840ab175f02c" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_5446d9d5b164da008143cd56dd" ON "Rules" ("name")
        `);
        await queryRunner.query(`
            CREATE TABLE "Services" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "name" character varying(255) NOT NULL,
                "description" character varying(255),
                "serviceType" character varying(255) NOT NULL,
                "endpoint" character varying(255),
                "configuration" json,
                "authentication" json,
                "isActive" boolean NOT NULL DEFAULT true,
                "lastHealthCheck" TIMESTAMP WITH TIME ZONE,
                "healthStatus" character varying(255) NOT NULL DEFAULT 'unknown',
                "timeoutMs" integer,
                "maxRetries" integer NOT NULL DEFAULT '3',
                "lastError" text,
                CONSTRAINT "PK_811d1dc4e17047c8aee4454b968" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_9d3d985f104300bfd21506bea1" ON "Services" ("name")
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EncounterCompetitions" DROP COLUMN "comments"
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."PlayerClaimMemberships" DROP CONSTRAINT "PK_b5c1ba2c8aa2ea86df91114eb60"
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."PlayerClaimMemberships" DROP COLUMN "id"
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."RoleClaimMemberships" DROP COLUMN "createdAt"
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."RoleClaimMemberships" DROP COLUMN "updatedAt"
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."RoleClaimMemberships" DROP CONSTRAINT "PK_83abbf86c650c05390fd7764ccd"
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."RoleClaimMemberships" DROP COLUMN "id"
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."PlayerRoleMemberships" DROP COLUMN "createdAt"
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."PlayerRoleMemberships" DROP COLUMN "updatedAt"
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."PlayerRoleMemberships" DROP CONSTRAINT "PK_27325872cd2ec9b98e262afdf30"
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."PlayerRoleMemberships" DROP COLUMN "id"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."LocationEventTournaments"
            ADD "id" uuid NOT NULL DEFAULT uuid_generate_v4()
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."LocationEventTournaments" DROP CONSTRAINT "LocationEventTournaments_pkey"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."LocationEventTournaments"
            ADD CONSTRAINT "LocationEventTournaments_pkey" PRIMARY KEY ("eventId", "locationId", "id")
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."LocationEventTournaments"
            ADD "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."LocationEventTournaments"
            ADD "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."LocationEventTournaments"
            ADD "isPrimary" boolean NOT NULL DEFAULT true
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."LocationEventTournaments"
            ADD "sortOrder" integer NOT NULL DEFAULT '0'
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."LocationEventTournaments"
            ADD "isActive" boolean NOT NULL DEFAULT true
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."PlayerClaimMemberships"
            ADD CONSTRAINT "PK_e9f5ace53cc7ec776583aa764a5" PRIMARY KEY ("claimId", "playerId")
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."RoleClaimMemberships"
            ADD CONSTRAINT "PK_8a83f2789ee8a3a1bd581902fa1" PRIMARY KEY ("claimId", "roleId")
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."PlayerRoleMemberships"
            ADD CONSTRAINT "PK_6e36673eb4c275e5dbf7b141970" PRIMARY KEY ("roleId", "playerId")
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."LocationEventTournaments" DROP CONSTRAINT "LocationEventTournaments_pkey"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."LocationEventTournaments"
            ADD CONSTRAINT "LocationEventTournaments_pkey" PRIMARY KEY ("eventId", "id")
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."LocationEventTournaments" DROP CONSTRAINT "LocationEventTournaments_pkey"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."LocationEventTournaments"
            ADD CONSTRAINT "PK_974bcc62122069d313cd798367b" PRIMARY KEY ("id")
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."Locations"
            ALTER COLUMN "coordinates" TYPE geometry
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_3dcf57ca4da85e9f7517bedde4" ON "event"."LocationEventTournaments" ("locationId")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_f1c8291e6d27e2cf131396e0ce" ON "event"."LocationEventTournaments" ("eventId")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_e376764011966f2f8e857df006" ON "event"."EncounterCompetitions" ("date")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_863db566eb7926ed7c2fbc327c" ON "event"."EncounterCompetitions" ("drawId")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_05610259e877e0a587774aed5c" ON "event"."EncounterCompetitions" ("awayTeamId")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_6b751e46339fc32e068d8129c0" ON "event"."EncounterCompetitions" ("homeTeamId")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_8c890805fb9d78c5464e7c3ee4" ON "ranking"."RankingPoints" ("playerId")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_d55c56c644dd344ba71e411dc9" ON "ranking"."RankingPoints" ("gameId")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_04ac71339ecdd93fe4fc64538b" ON "event"."Games" ("playedAt")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_23a63680907f876d87ef55f9d0" ON "event"."Games" ("linkId", "linkType")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_afe644cba7b2ed50c0051cf9b9" ON "event"."GamePlayerMemberships" ("gameId")
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
        await queryRunner.query(`
            ALTER TABLE "security"."PlayerRoleMemberships"
            ADD CONSTRAINT "FK_d3e4951d21386ee72a663eeec58" FOREIGN KEY ("roleId") REFERENCES "security"."Roles"("id") ON DELETE CASCADE ON UPDATE CASCADE
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "security"."PlayerRoleMemberships" DROP CONSTRAINT "FK_d3e4951d21386ee72a663eeec58"
        `);
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
            DROP INDEX "event"."IDX_afe644cba7b2ed50c0051cf9b9"
        `);
        await queryRunner.query(`
            DROP INDEX "event"."IDX_23a63680907f876d87ef55f9d0"
        `);
        await queryRunner.query(`
            DROP INDEX "event"."IDX_04ac71339ecdd93fe4fc64538b"
        `);
        await queryRunner.query(`
            DROP INDEX "ranking"."IDX_d55c56c644dd344ba71e411dc9"
        `);
        await queryRunner.query(`
            DROP INDEX "ranking"."IDX_8c890805fb9d78c5464e7c3ee4"
        `);
        await queryRunner.query(`
            DROP INDEX "event"."IDX_6b751e46339fc32e068d8129c0"
        `);
        await queryRunner.query(`
            DROP INDEX "event"."IDX_05610259e877e0a587774aed5c"
        `);
        await queryRunner.query(`
            DROP INDEX "event"."IDX_863db566eb7926ed7c2fbc327c"
        `);
        await queryRunner.query(`
            DROP INDEX "event"."IDX_e376764011966f2f8e857df006"
        `);
        await queryRunner.query(`
            DROP INDEX "event"."IDX_f1c8291e6d27e2cf131396e0ce"
        `);
        await queryRunner.query(`
            DROP INDEX "event"."IDX_3dcf57ca4da85e9f7517bedde4"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."Locations"
            ALTER COLUMN "coordinates" TYPE geometry(GEOMETRY, 0)
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."LocationEventTournaments" DROP CONSTRAINT "PK_974bcc62122069d313cd798367b"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."LocationEventTournaments"
            ADD CONSTRAINT "LocationEventTournaments_pkey" PRIMARY KEY ("eventId", "id")
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."LocationEventTournaments" DROP CONSTRAINT "LocationEventTournaments_pkey"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."LocationEventTournaments"
            ADD CONSTRAINT "LocationEventTournaments_pkey" PRIMARY KEY ("eventId", "locationId", "id")
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."PlayerRoleMemberships" DROP CONSTRAINT "PK_6e36673eb4c275e5dbf7b141970"
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."RoleClaimMemberships" DROP CONSTRAINT "PK_8a83f2789ee8a3a1bd581902fa1"
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."PlayerClaimMemberships" DROP CONSTRAINT "PK_e9f5ace53cc7ec776583aa764a5"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."LocationEventTournaments" DROP COLUMN "isActive"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."LocationEventTournaments" DROP COLUMN "sortOrder"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."LocationEventTournaments" DROP COLUMN "isPrimary"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."LocationEventTournaments" DROP COLUMN "updatedAt"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."LocationEventTournaments" DROP COLUMN "createdAt"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."LocationEventTournaments" DROP CONSTRAINT "LocationEventTournaments_pkey"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."LocationEventTournaments"
            ADD CONSTRAINT "LocationEventTournaments_pkey" PRIMARY KEY ("eventId", "locationId")
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."LocationEventTournaments" DROP COLUMN "id"
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."PlayerRoleMemberships"
            ADD "id" uuid NOT NULL DEFAULT uuid_generate_v4()
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."PlayerRoleMemberships"
            ADD CONSTRAINT "PK_27325872cd2ec9b98e262afdf30" PRIMARY KEY ("id")
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."PlayerRoleMemberships"
            ADD "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."PlayerRoleMemberships"
            ADD "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."RoleClaimMemberships"
            ADD "id" uuid NOT NULL DEFAULT uuid_generate_v4()
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."RoleClaimMemberships"
            ADD CONSTRAINT "PK_83abbf86c650c05390fd7764ccd" PRIMARY KEY ("id")
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."RoleClaimMemberships"
            ADD "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."RoleClaimMemberships"
            ADD "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."PlayerClaimMemberships"
            ADD "id" uuid NOT NULL DEFAULT uuid_generate_v4()
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."PlayerClaimMemberships"
            ADD CONSTRAINT "PK_b5c1ba2c8aa2ea86df91114eb60" PRIMARY KEY ("id")
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EncounterCompetitions"
            ADD "comments" text
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_9d3d985f104300bfd21506bea1"
        `);
        await queryRunner.query(`
            DROP TABLE "Services"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_5446d9d5b164da008143cd56dd"
        `);
        await queryRunner.query(`
            DROP TABLE "Rules"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_a8508a1eb452186da26aeb31e0"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_b25e69de231068af52d37764b4"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_e87c2388e21aa0be3f1f3275f6"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_68a614f735c057f86c53639f98"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_34ebd9f22d8e5381942a393562"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_569106f7a14b34bbbda6784721"
        `);
        await queryRunner.query(`
            DROP TABLE "LogEntries"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_1579c5f8a9dac83109f345d567"
        `);
        await queryRunner.query(`
            DROP TABLE "CronJobs"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_bb0519dfd42075f6fb16158e49"
        `);
        await queryRunner.query(`
            DROP TABLE "ImportFiles"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_4310511198480557ffc7459ff9"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_d40d473e5fcf75b78a0d0d9aa7"
        `);
        await queryRunner.query(`
            DROP TABLE "CompetitionGroupSubEventMemberships"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_0a911c701df45ba8c9b48f6198"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_018fdde998a631c799bdb2af6f"
        `);
        await queryRunner.query(`
            DROP TABLE "TournamentGroupSubEventMemberships"
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."PlayerClaimMemberships"
            ADD CONSTRAINT "FK_a03d57401ba2f731457db73a67a" FOREIGN KEY ("playerId") REFERENCES "Players"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."PlayerRoleMemberships"
            ADD CONSTRAINT "FK_d3e4951d21386ee72a663eeec58" FOREIGN KEY ("roleId") REFERENCES "security"."Roles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."RoleClaimMemberships"
            ADD CONSTRAINT "FK_c58a3fa6f0cf3e39415fb8c921e" FOREIGN KEY ("roleId") REFERENCES "security"."Roles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."RoleClaimMemberships"
            ADD CONSTRAINT "FK_ff730a10bb49aa72b3970ad9f02" FOREIGN KEY ("claimId") REFERENCES "security"."Claims"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "security"."PlayerClaimMemberships"
            ADD CONSTRAINT "FK_4e01a9879a5374db2acd070d672" FOREIGN KEY ("claimId") REFERENCES "security"."Claims"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."LocationEventTournaments"
            ADD CONSTRAINT "LocationEventTournaments_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "event"."Locations"("id") ON DELETE CASCADE ON UPDATE CASCADE
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."LocationEventTournaments"
            ADD CONSTRAINT "LocationEventTournaments_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "event"."EventTournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE
        `);
    }

}
