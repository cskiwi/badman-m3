import { MigrationInterface, QueryRunner } from "typeorm";

export class AddingSomeIndexes1757776509738 implements MigrationInterface {
    name = 'AddingSomeIndexes1757776509738'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "event"."Locations"
            ALTER COLUMN "coordinates" TYPE geometry
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_f6ebc0406b41edf7dcddb4a971" ON "ranking"."RankingPlaces" ("playerId", "systemId", "rankingDate")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_0fdd406a466924cd7fbaed4f85" ON "event"."GamePlayerMemberships" ("playerId", "gameId")
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DROP INDEX "event"."IDX_0fdd406a466924cd7fbaed4f85"
        `);
        await queryRunner.query(`
            DROP INDEX "ranking"."IDX_f6ebc0406b41edf7dcddb4a971"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."Locations"
            ALTER COLUMN "coordinates" TYPE geometry(GEOMETRY, 0)
        `);
    }

}
