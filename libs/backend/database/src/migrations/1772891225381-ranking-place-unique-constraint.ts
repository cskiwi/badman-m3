import { MigrationInterface, QueryRunner } from "typeorm";

export class RankingPlaceUniqueConstraint1772891225381 implements MigrationInterface {
    name = 'RankingPlaceUniqueConstraint1772891225381'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DROP INDEX "ranking"."IDX_f6ebc0406b41edf7dcddb4a971"
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_f6ebc0406b41edf7dcddb4a971" ON "ranking"."RankingPlaces" ("playerId", "systemId", "rankingDate")
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DROP INDEX "ranking"."IDX_f6ebc0406b41edf7dcddb4a971"
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_f6ebc0406b41edf7dcddb4a971" ON "ranking"."RankingPlaces" ("rankingDate", "playerId", "systemId")
        `);
    }

}
