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
