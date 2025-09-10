import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateModelsBasedToernooiAPI1757094264444 implements MigrationInterface {
    name = 'UpdateModelsBasedToernooiAPI1757094264444'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "event"."SubEventTournaments"
            ADD "levelId" integer
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."SubEventTournaments"
            ADD "genderId" integer
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."SubEventTournaments"
            ADD "gameTypeId" integer
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."SubEventTournaments"
            ADD "paraClassId" integer
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."SubEventCompetitions"
            ADD "genderId" integer
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."SubEventCompetitions"
            ADD "gameTypeId" integer
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."SubEventCompetitions"
            ADD "paraClassId" integer
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."Locations"
            ALTER COLUMN "coordinates" TYPE geometry
        `);
         await queryRunner.query(`
            delete from "event"."Standings" where "entryId" in (select "id" from "event"."Entries" where "teamId" in ('a0548712-2c28-4783-83e4-044200f7ebdb', 'e39a73da-460b-44ad-8c30-78bb574f39b4'))
        `);
        await queryRunner.query(`
            delete from "event"."Entries" where "teamId" in ('a0548712-2c28-4783-83e4-044200f7ebdb', 'e39a73da-460b-44ad-8c30-78bb574f39b4')
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."Entries"
            ADD CONSTRAINT "FK_bc7d7f97d512a125be110efc552" FOREIGN KEY ("teamId") REFERENCES "Teams"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "event"."Entries" DROP CONSTRAINT "FK_bc7d7f97d512a125be110efc552"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."Locations"
            ALTER COLUMN "coordinates" TYPE geometry(GEOMETRY, 0)
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."SubEventCompetitions" DROP COLUMN "paraClassId"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."SubEventCompetitions" DROP COLUMN "gameTypeId"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."SubEventCompetitions" DROP COLUMN "genderId"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."SubEventTournaments" DROP COLUMN "paraClassId"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."SubEventTournaments" DROP COLUMN "gameTypeId"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."SubEventTournaments" DROP COLUMN "genderId"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."SubEventTournaments" DROP COLUMN "levelId"
        `);
    }

}
