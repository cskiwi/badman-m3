// import { Field, ObjectType } from '@nestjs/graphql';
// import {
//   BaseEntity,
//   CreateDateColumn,
//   Entity,
//   PrimaryGeneratedColumn,
//   UpdateDateColumn
// } from 'typeorm';
// @ObjectType('EncounterCompetition')
// @Entity('EncounterCompetitions', { schema: 'event' })
// export class EncounterCompetition extends BaseEntity {
//   @Field(() => ID)
//   @PrimaryGeneratedColumn('uuid')
//   declare id: string;

//   @SortableField()
//   @CreateDateColumn()
//   declare createdAt: Date;

//   @SortableField({ nullable: true })
//   @UpdateDateColumn({ nullable: true })
//   declare updatedAt: Date;

//   date?: Date;
//   originalDate?: Date;
//   // drawCompetition?: DrawCompetition;
//   visualCode?: string;
//   // assemblies: Assembly[];
//   games?: Game[];
//   homeScore?: number;
//   awayScore?: number;
//   home?: Team;
//   away?: Team;
//   drawId?: string;
//   locationId?: string;
//   location?: Location;
//   originalLocationId?: Date;
//   originalLocation?: Location;

//   shuttle?: string;
//   startHour?: string;
//   endHour?: string;
//   gameLeader?: Player;

//   homeTeamId?: string;
//   awayTeamId?: string;

//   // encounterChange?: EncounterChange;

  
// }
