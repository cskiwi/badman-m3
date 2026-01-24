import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCompetitionEditPermissions1768929326773 implements MigrationInterface {
  name = 'AddCompetitionEditPermissions1768929326773';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add the edit-any:competition claim
    await queryRunner.query(`
      INSERT INTO "security"."Claims" ("id", "name", "description", "category", "type", "createdAt", "updatedAt")
      VALUES (
        uuid_generate_v4(),
        'edit-any:competition',
        'Permission to edit any competition',
        'competition',
        'competition',
        NOW(),
        NOW()
      )
      ON CONFLICT ("name", "category") DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove the edit-any:competition claim
    await queryRunner.query(`
      DELETE FROM "security"."Claims"
      WHERE "name" = 'edit-any:competition' AND "category" = 'competition'
    `);
  }
}
