import { MigrationInterface, QueryRunner } from "typeorm";

export class CascadeStandingEntry1776587234997 implements MigrationInterface {
    name = 'CascadeStandingEntry1776587234997'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "event"."Standings" DROP CONSTRAINT "FK_8e23443cc2621bd06c7e3cbb44b"
        `);
        await queryRunner.query(`
            ALTER TABLE "system"."CronJobs"
            ALTER COLUMN "type" DROP DEFAULT
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_1579c5f8a9dac83109f345d567" ON "system"."CronJobs" ("name")
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."Standings"
            ADD CONSTRAINT "FK_8e23443cc2621bd06c7e3cbb44b" FOREIGN KEY ("entryId") REFERENCES "event"."Entries"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "event"."Standings" DROP CONSTRAINT "FK_8e23443cc2621bd06c7e3cbb44b"
        `);
        await queryRunner.query(`
            DROP INDEX "system"."IDX_1579c5f8a9dac83109f345d567"
        `);
        await queryRunner.query(`
            ALTER TABLE "system"."CronJobs"
            ALTER COLUMN "type"
            SET DEFAULT 'sync'
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."Standings"
            ADD CONSTRAINT "FK_8e23443cc2621bd06c7e3cbb44b" FOREIGN KEY ("entryId") REFERENCES "event"."Entries"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    }

}
