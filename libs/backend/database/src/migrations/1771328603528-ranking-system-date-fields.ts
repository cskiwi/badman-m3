import { MigrationInterface, QueryRunner } from "typeorm";

export class RankingSystemDateFields1771328603528 implements MigrationInterface {
    name = 'RankingSystemDateFields1771328603528'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add new date columns first
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingSystems"
            ADD "startDate" TIMESTAMP WITH TIME ZONE
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingSystems"
            ADD "endDate" TIMESTAMP WITH TIME ZONE
        `);

        // Migrate data: active (primary) systems get endDate = NULL, inactive get endDate = createdAt
        await queryRunner.query(`
            UPDATE "ranking"."RankingSystems"
            SET "startDate" = "createdAt", "endDate" = NULL
            WHERE "primary" = true
        `);
        await queryRunner.query(`
            UPDATE "ranking"."RankingSystems"
            SET "startDate" = "createdAt", "endDate" = "createdAt"
            WHERE "primary" = false
        `);

        // Now safe to drop the primary column
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingSystems" DROP COLUMN "primary"
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingPoints"
            ALTER COLUMN "differenceInLevel" TYPE numeric(2)
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingPoints"
            ALTER COLUMN "differenceInLevel" TYPE numeric(10, 2)
        `);
        // Re-add primary column
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingSystems"
            ADD "primary" boolean NOT NULL DEFAULT false
        `);
        // Restore primary = true where endDate IS NULL
        await queryRunner.query(`
            UPDATE "ranking"."RankingSystems"
            SET "primary" = true
            WHERE "endDate" IS NULL
        `);
        // Drop date columns
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingSystems" DROP COLUMN "endDate"
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingSystems" DROP COLUMN "startDate"
        `);
    }

}
