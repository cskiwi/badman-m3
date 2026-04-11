import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedCronJobs1775381681470 implements MigrationInterface {
  name = 'SeedCronJobs1775381681470';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop the incorrectly placed public."CronJobs" table if it exists
    await queryRunner.query(`DROP TABLE IF EXISTS "public"."CronJobs" CASCADE`);

    // Seed cron jobs (only insert if they don't already exist)
    const cronJobs = [
      {
        name: 'tournament-discovery',
        type: 'sync',
        cronTime: '0 6 * * *',
        meta: JSON.stringify({ jobName: 'scheduleTournamentDiscovery', queueName: 'tournament-discovery' }),
      },
      {
        name: 'competition-sync',
        type: 'sync',
        cronTime: '0 */12 * 1-4,8-12 *',
        meta: JSON.stringify({ jobName: 'scheduleCompetitionSync', queueName: 'competition-event' }),
      },
      {
        name: 'tournament-sync',
        type: 'sync',
        cronTime: '0 */12 * * *',
        meta: JSON.stringify({ jobName: 'scheduleTournamentSync', queueName: 'tournament-event' }),
      },
      {
        name: 'ranking-sync',
        type: 'ranking',
        cronTime: '0 4 * * 1',
        meta: JSON.stringify({ jobName: 'scheduleRankingSync', queueName: 'ranking-sync' }),
      },
      {
        name: 'ranking-calc',
        type: 'ranking',
        cronTime: '0 3 * * *',
        meta: JSON.stringify({ jobName: 'scheduleRankingCalc', queueName: 'ranking-calc' }),
      },
    ];

    for (const job of cronJobs) {
      const exists = await queryRunner.query(`SELECT 1 FROM "system"."CronJobs" WHERE "name" = $1`, [job.name]);
      if (exists.length === 0) {
        await queryRunner.query(
          `INSERT INTO "system"."CronJobs" ("id", "name", "type", "cronTime", "meta", "active", "createdAt", "updatedAt")
           VALUES (gen_random_uuid(), $1, $2, $3, $4, true, NOW(), NOW())`,
          [job.name, job.type, job.cronTime, job.meta],
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
