import { MigrationInterface, QueryRunner } from "typeorm";

export class TypeToEnum1757329543910 implements MigrationInterface {
    name = 'TypeToEnum1757329543910'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TYPE "event"."SubEventTournaments_eventtype_enum"
            RENAME TO "SubEventTournaments_eventtype_enum_old"
        `);
        await queryRunner.query(`
            CREATE TYPE "event"."SubEventTournaments_eventtype_enum" AS ENUM('M', 'F', 'MX', 'NATIONAL')
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."SubEventTournaments"
            ALTER COLUMN "eventType" TYPE "event"."SubEventTournaments_eventtype_enum" USING "eventType"::"text"::"event"."SubEventTournaments_eventtype_enum"
        `);
        await queryRunner.query(`
            DROP TYPE "event"."SubEventTournaments_eventtype_enum_old"
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."Locations"
            ALTER COLUMN "coordinates" TYPE geometry
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "event"."Locations"
            ALTER COLUMN "coordinates" TYPE geometry(GEOMETRY, 0)
        `);
        await queryRunner.query(`
            CREATE TYPE "event"."SubEventTournaments_eventtype_enum_old" AS ENUM('F', 'M', 'MINIBAD', 'MX')
        `);
        await queryRunner.query(`
            ALTER TABLE "event"."SubEventTournaments"
            ALTER COLUMN "eventType" TYPE "event"."SubEventTournaments_eventtype_enum_old" USING "eventType"::"text"::"event"."SubEventTournaments_eventtype_enum_old"
        `);
        await queryRunner.query(`
            DROP TYPE "event"."SubEventTournaments_eventtype_enum"
        `);
        await queryRunner.query(`
            ALTER TYPE "event"."SubEventTournaments_eventtype_enum_old"
            RENAME TO "SubEventTournaments_eventtype_enum"
        `);
    }

}
