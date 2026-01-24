import { MigrationInterface, QueryRunner } from 'typeorm';

export class ChangeClaims1769264180784 implements MigrationInterface {
  name = 'ChangeClaims1769264180784';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add the change-claims:player claim
    await queryRunner.query(`
      INSERT INTO "security"."Claims" ("id", "name", "description", "category", "type", "createdAt", "updatedAt")
      VALUES (
        uuid_generate_v4(),
        'edit:claims',
        'Change claims for players',
        'player',
        'global',
        NOW(),
        NOW()
      )
      ON CONFLICT ("name", "category") DO NOTHING
    `);

    // Rename status:competition to change-competition:player
    await queryRunner.query(`
      UPDATE "security"."Claims"
      SET "name" = 'change:competition', "updatedAt" = NOW()
      WHERE "name" = 'status:competition'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert change-competition:player back to status:competition
    await queryRunner.query(`
      UPDATE "security"."Claims"
      SET "name" = 'status:competition', "updatedAt" = NOW()
      WHERE "name" = 'change:competition'
    `);

    // Remove the change-claims:player claim
    await queryRunner.query(`
      DELETE FROM "security"."Claims"
      WHERE "name" = 'edit:claims' AND "category" = 'player'
    `);
  }
}
