import { MigrationInterface, QueryRunner } from "typeorm";

export class AddVisualCodeToTeams1768646868297 implements MigrationInterface {
    name = 'AddVisualCodeToTeams1768646868297'

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
            ALTER TABLE "Teams"
            ADD "visualCode" character varying(255)
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."Locations"
            ALTER COLUMN "coordinates" TYPE geometry
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
            ALTER TABLE "event"."Locations"
            ALTER COLUMN "coordinates" TYPE geometry(GEOMETRY, 0)
        `);
        await queryRunner.query(`
            ALTER TABLE "Teams" DROP COLUMN "visualCode"
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
