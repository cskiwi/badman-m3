import { MigrationInterface, QueryRunner } from "typeorm";

export class IndexForEncounter1775305104982 implements MigrationInterface {
    name = 'IndexForEncounter1775305104982'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE INDEX "IDX_56517dacf1a6905dfde6f45348" ON "event"."EncounterCompetitions" ("awayTeamId", "date")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_5309377f8380e34e7026fe4883" ON "event"."EncounterCompetitions" ("homeTeamId", "date")
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DROP INDEX "event"."IDX_5309377f8380e34e7026fe4883"
        `);
        await queryRunner.query(`
            DROP INDEX "event"."IDX_56517dacf1a6905dfde6f45348"
        `);
    }

}
