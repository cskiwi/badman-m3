import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCaptainAndLeaderPresenceColumns1737901200000 implements MigrationInterface {
  name = 'AddCaptainAndLeaderPresenceColumns1737901200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add captain and game leader presence columns to EncounterCompetitions table
    await queryRunner.query(`
      ALTER TABLE "event"."EncounterCompetitions"
      ADD COLUMN "homeCaptainPresent" boolean NOT NULL DEFAULT false,
      ADD COLUMN "awayCaptainPresent" boolean NOT NULL DEFAULT false,
      ADD COLUMN "gameLeaderPresent" boolean NOT NULL DEFAULT false,
      ADD COLUMN "homeCaptainAccepted" boolean NOT NULL DEFAULT false,
      ADD COLUMN "awayCaptainAccepted" boolean NOT NULL DEFAULT false,
      ADD COLUMN "gameLeaderAccepted" boolean NOT NULL DEFAULT false;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove captain and game leader presence columns from EncounterCompetitions table
    await queryRunner.query(`
      ALTER TABLE "event"."EncounterCompetitions"
      DROP COLUMN "homeCaptainPresent",
      DROP COLUMN "awayCaptainPresent", 
      DROP COLUMN "gameLeaderPresent",
      DROP COLUMN "homeCaptainAccepted",
      DROP COLUMN "awayCaptainAccepted",
      DROP COLUMN "gameLeaderAccepted";
    `);
  }
}