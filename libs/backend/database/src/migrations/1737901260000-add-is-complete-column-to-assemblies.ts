import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIsCompleteColumnToAssemblies1737901260000 implements MigrationInterface {
  name = 'AddIsCompleteColumnToAssemblies1737901260000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add isComplete column to CompetitionAssemblies table
    await queryRunner.query(`
      ALTER TABLE "event"."CompetitionAssemblies"
      ADD COLUMN "isComplete" boolean NOT NULL DEFAULT false;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove isComplete column from CompetitionAssemblies table
    await queryRunner.query(`
      ALTER TABLE "event"."CompetitionAssemblies"
      DROP COLUMN "isComplete";
    `);
  }
}