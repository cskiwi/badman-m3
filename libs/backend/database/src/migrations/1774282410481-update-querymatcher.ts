import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateQueryMatcher1774282410481 implements MigrationInterface {
  name = 'UpdateQueryMatcher1774282410481';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      update "event"."EventCompetitions" 
      set "teamMatcher" = '^(?<clubName>.*?) (?<teamNumber>\d)(?<gender>[DHG]) ?\(?(?<index>\d*)?\)? ?(?<rest>.*?)?$'
      where "teamMatcher"= '^(?<name>.*?) (?<number>\d)(?<type>[DHG]) ?\(?(?<index>\d*)?\)? ?(?<rest>.*?)?$';    
    `);
   
      await queryRunner.query(`update "event"."EventCompetitions" 
      set "teamMatcher" = '^(?<clubName>.*?) (?<teamNumber>\d) \((?<gender>.*?)\) (?<rest>.*?)$'
      where "teamMatcher"= '^(?<name>.*?) (?<number>\d) \((?<type>.*?)\) (?<rest>.*?)$';
    `);
    await queryRunner.query(`
      update "event"."EventCompetitions" 
      set "teamMatcher" = '^(?<clubName>.*?) (?<teamNumber>\d)(?<gender>[DHG]) \((?<index>\d*)\) ?(?<rest>.*?)?$'
      where "teamMatcher"= '^(?<name>.*?) (?<number>\d)(?<type>[DHG]) \((?<index>\d*)\) ?(?<rest>.*?)?$';   
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
 await queryRunner.query(`
      update "event"."EventCompetitions" 
      set "teamMatcher" = '^(?<name>.*?) (?<number>\d)(?<type>[DHG]) ?\(?(?<index>\d*)?\)? ?(?<rest>.*?)?$'
      where "teamMatcher"= '^(?<clubName>.*?) (?<teamNumber>\d)(?<gender>[DHG]) ?\(?(?<index>\d*)?\)? ?(?<rest>.*?)?$';    
    `);
   
      await queryRunner.query(`update "event"."EventCompetitions" 
      set "teamMatcher" = '^(?<name>.*?) (?<number>\d) \((?<type>.*?)\) (?<rest>.*?)$'
      where "teamMatcher"= '^(?<clubName>.*?) (?<teamNumber>\d) \((?<gender>.*?)\) (?<rest>.*?)$';
    `);
    await queryRunner.query(`
      update "event"."EventCompetitions" 
      set "teamMatcher" = '^(?<name>.*?) (?<number>\d)(?<type>[DHG]) \((?<index>\d*)\) ?(?<rest>.*?)?$'
      where "teamMatcher"= '^(?<clubName>.*?) (?<teamNumber>\d)(?<gender>[DHG]) \((?<index>\d*)\) ?(?<rest>.*?)?$';   
    `);
  }


}
