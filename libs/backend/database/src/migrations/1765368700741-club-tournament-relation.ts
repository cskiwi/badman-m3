import { MigrationInterface, QueryRunner } from "typeorm";

export class ClubTournamentRelation1765368700741 implements MigrationInterface {
    name = 'ClubTournamentRelation1765368700741'

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
            ALTER TABLE "event"."EventTournaments"
            ADD "clubId" uuid
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."Locations"
            ALTER COLUMN "coordinates" TYPE geometry
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_fc3f20a3ba490a4d12dad3b5c5" ON "event"."EventTournaments" ("clubId")
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EventTournaments"
            ADD CONSTRAINT "FK_fc3f20a3ba490a4d12dad3b5c5e" FOREIGN KEY ("clubId") REFERENCES "Clubs"("id") ON DELETE
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
            ALTER TABLE "event"."EventTournaments" DROP CONSTRAINT "FK_fc3f20a3ba490a4d12dad3b5c5e"
        `);
        await queryRunner.query(`
            DROP INDEX "event"."IDX_fc3f20a3ba490a4d12dad3b5c5"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."Locations"
            ALTER COLUMN "coordinates" TYPE geometry(GEOMETRY, 0)
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EventTournaments" DROP COLUMN "clubId"
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
