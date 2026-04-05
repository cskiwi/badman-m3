import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedCronJobs1775381681470 implements MigrationInterface {
  name = 'SeedCronJobs1775381681470';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Seed cron jobs - only insert if they don't already exist
    const cronJobs = [
      {
        name: 'tournament-discovery',
        description: 'Daily tournament discovery',
        cronExpression: '0 6 * * *',
        jobFunction: 'scheduleTournamentDiscovery',
      },
      {
        name: 'competition-sync',
        description: 'Competition structure sync during competition season (Aug-Apr)',
        cronExpression: '0 */12 * 1-4,8-12 *',
        jobFunction: 'scheduleCompetitionSync',
      },
      {
        name: 'tournament-sync',
        description: 'Tournament structure sync',
        cronExpression: '0 */12 * * *',
        jobFunction: 'scheduleTournamentSync',
      },
      {
        name: 'ranking-sync',
        description: 'BBF Rating ranking sync',
        cronExpression: '0 4 * * 1',
        jobFunction: 'scheduleRankingSync',
      },
      {
        name: 'ranking-calc',
        description: 'Self-calculated ranking for non-VISUAL systems',
        cronExpression: '0 3 * * *',
        jobFunction: 'scheduleRankingCalc',
      },
    ];

    for (const job of cronJobs) {
      const exists = await queryRunner.query(`SELECT 1 FROM "system"."CronJobs" WHERE "name" = $1`, [job.name]);

      if (exists.length === 0) {
        await queryRunner.query(
          `INSERT INTO "system"."CronJobs" ("id", "name", "description", "cronExpression", "jobFunction", "isActive", "createdAt", "updatedAt")
           VALUES (gen_random_uuid(), $1, $2, $3, $4, true, NOW(), NOW())`,
          [job.name, job.description, job.cronExpression, job.jobFunction],
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "system"."CronJobs" WHERE "name" IN ($1, $2, $3, $4, $5)`, [
      'tournament-discovery',
      'competition-sync',
      'tournament-sync',
      'ranking-sync',
      'ranking-calc',
    ]);
  }
}
