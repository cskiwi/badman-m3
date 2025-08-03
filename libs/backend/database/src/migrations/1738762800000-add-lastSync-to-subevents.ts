import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLastSyncToSubevents1738762800000 implements MigrationInterface {
  name = 'AddLastSyncToSubevents1738762800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add lastSync column to tournament sub-events
    await queryRunner.query(`
      ALTER TABLE "event"."SubEventTournaments" 
      ADD COLUMN "lastSync" TIMESTAMP NULL
    `);

    // Add lastSync column to competition sub-events
    await queryRunner.query(`
      ALTER TABLE "event"."SubEventCompetitions" 
      ADD COLUMN "lastSync" TIMESTAMP NULL
    `);

    // Add lastSync column to tournament draws
    await queryRunner.query(`
      ALTER TABLE "event"."DrawTournaments" 
      ADD COLUMN "lastSync" TIMESTAMP NULL
    `);

    // Add lastSync column to competition draws
    await queryRunner.query(`
      ALTER TABLE "event"."DrawCompetitions" 
      ADD COLUMN "lastSync" TIMESTAMP NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove lastSync column from tournament sub-events
    await queryRunner.query(`
      ALTER TABLE "event"."SubEventTournaments" 
      DROP COLUMN "lastSync"
    `);

    // Remove lastSync column from competition sub-events
    await queryRunner.query(`
      ALTER TABLE "event"."SubEventCompetitions" 
      DROP COLUMN "lastSync"
    `);

    // Remove lastSync column from tournament draws
    await queryRunner.query(`
      ALTER TABLE "event"."DrawTournaments" 
      DROP COLUMN "lastSync"
    `);

    // Remove lastSync column from competition draws
    await queryRunner.query(`
      ALTER TABLE "event"."DrawCompetitions" 
      DROP COLUMN "lastSync"
    `);
  }
}