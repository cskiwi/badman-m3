import { MigrationInterface, QueryRunner } from "typeorm";

export class NewStuff1756304179074 implements MigrationInterface {
    name = 'NewStuff1756304179074'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingPlaces"
            ADD "groupId" uuid
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingLastPlaces"
            ADD "groupId" uuid
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."Standings" DROP CONSTRAINT "FK_8e23443cc2621bd06c7e3cbb44b"
        `);
        
        // Remove duplicates from Standings table, keeping the newest record
        await queryRunner.query(`
            DELETE FROM "event"."Standings" s1
            USING "event"."Standings" s2
            WHERE s1."entryId" = s2."entryId"
            AND s1."updatedAt" < s2."updatedAt";
        `);
        
        await queryRunner.query(`
            ALTER TABLE "event"."Standings"
            ADD CONSTRAINT "UQ_8e23443cc2621bd06c7e3cbb44b" UNIQUE ("entryId")
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EventCompetitions" DROP CONSTRAINT "EventCompetitions_slug_key"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EventCompetitions"
            ALTER COLUMN "usedRankingAmount"
            SET NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingSystemRankingGroupMemberships" DROP CONSTRAINT "FK_3b8afe506db2e006445d8fe9a22"
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingGroups"
            ALTER COLUMN "id"
            SET DEFAULT uuid_generate_v4()
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."Locations"
            ALTER COLUMN "coordinates" TYPE geometry
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."Standings"
            ADD CONSTRAINT "FK_8e23443cc2621bd06c7e3cbb44b" FOREIGN KEY ("entryId") REFERENCES "event"."Entries"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingSystemRankingGroupMemberships"
            ADD CONSTRAINT "FK_3b8afe506db2e006445d8fe9a22" FOREIGN KEY ("groupId") REFERENCES "ranking"."RankingGroups"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingPlaces"
            ADD CONSTRAINT "FK_e6b4f4c44b75f602be6416b996b" FOREIGN KEY ("groupId") REFERENCES "ranking"."RankingGroups"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingLastPlaces"
            ADD CONSTRAINT "FK_27e81294410157fd7b2edefd9b9" FOREIGN KEY ("groupId") REFERENCES "ranking"."RankingGroups"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingLastPlaces" DROP CONSTRAINT "FK_27e81294410157fd7b2edefd9b9"
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingPlaces" DROP CONSTRAINT "FK_e6b4f4c44b75f602be6416b996b"
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingSystemRankingGroupMemberships" DROP CONSTRAINT "FK_3b8afe506db2e006445d8fe9a22"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."Standings" DROP CONSTRAINT "FK_8e23443cc2621bd06c7e3cbb44b"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."Locations"
            ALTER COLUMN "coordinates" TYPE geometry(GEOMETRY, 0)
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingGroups"
            ALTER COLUMN "id" DROP DEFAULT
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingSystemRankingGroupMemberships"
            ADD CONSTRAINT "FK_3b8afe506db2e006445d8fe9a22" FOREIGN KEY ("groupId") REFERENCES "ranking"."RankingGroups"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EventCompetitions"
            ALTER COLUMN "usedRankingAmount" DROP NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."EventCompetitions"
            ADD CONSTRAINT "EventCompetitions_slug_key" UNIQUE ("slug")
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."Standings" DROP CONSTRAINT "UQ_8e23443cc2621bd06c7e3cbb44b"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."Standings"
            ADD CONSTRAINT "FK_8e23443cc2621bd06c7e3cbb44b" FOREIGN KEY ("entryId") REFERENCES "event"."Entries"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingLastPlaces" DROP COLUMN "groupId"
        `);
        await queryRunner.query(`
            ALTER TABLE "ranking"."RankingPlaces" DROP COLUMN "groupId"
        `);
    }

}
