import { LevelType } from '@app/model/enums';
import { SortableField, WhereField } from '@app/utils';
import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CompetitionSubEvent } from './competition-sub-event.model';

@Entity('EventCompetitions', { schema: 'event' })
@ObjectType('CompetitionEvent', { description: 'A CompetitionEvent' })
export class CompetitionEvent extends BaseEntity {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  declare id: string;

  @SortableField()
  @WhereField()
  @CreateDateColumn()
  declare createdAt: Date;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @UpdateDateColumn({ nullable: true })
  declare updatedAt: Date;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column()
  declare name: string;

  @SortableField(() => Int, { nullable: true })
  @WhereField(() => Int, { nullable: true })
  @Column()
  declare season: number;

  @SortableField(() => Date, { nullable: true })
  @WhereField(() => Date, { nullable: true })
  @Column()
  declare lastSync: Date;

  @SortableField(() => Date, { nullable: true })
  @WhereField(() => Date, { nullable: true })
  @Column()
  declare openDate: Date;

  @SortableField(() => Date, { nullable: true })
  @WhereField(() => Date, { nullable: true })
  @Column()
  declare closeDate: Date;

  @SortableField(() => Date, { nullable: true })
  @WhereField(() => Date, { nullable: true })
  @Column()
  declare changeOpenDate: Date;

  @SortableField(() => Date, { nullable: true })
  @Column()
  declare changeCloseDatePeriod1: Date;

  @SortableField(() => Date, { nullable: true })
  @Column()
  declare changeCloseRequestDatePeriod1: Date;
  
  @SortableField(() => Date, { nullable: true })
  @Column()
  declare changeCloseDatePeriod2: Date;

  @SortableField(() => Date, { nullable: true })
  @Column()
  declare changeCloseRequestDatePeriod2: Date;

  // @SortableField(() => EventCompetitionMetaType, { nullable: true })
  // @Column({
  //   type: DataType.JSON,
  // })
  // meta?: MetaEventCompetition;


  @SortableField({ nullable: true })
  @Column()
  declare visualCode: string;

  @SortableField({ nullable: true })
  @Column()
  declare slug: string;

  @SortableField({ nullable: true })
  @Column()
  declare teamMatcher?: string;


  @SortableField(() => Boolean)
  @Column({
    default: false,
  })
  declare official: boolean;

  @SortableField(() => String, { nullable: true })
  @Column({
    type: 'simple-enum',
    enum: LevelType,
  })
  declare type: LevelType;

  @SortableField(() => Boolean)
  @Column({
    default: false,
  })
  declare checkEncounterForFilledIn: boolean;


  @SortableField({ nullable: true })
  @Column()
  declare state: string;

  @SortableField({ nullable: true })
  @Column()
  declare country: string;

  @Field(() => [CompetitionSubEvent], { nullable: true })
  @OneToMany(() => CompetitionSubEvent, (subEvent) => subEvent.competitionEvent)
  declare competitionSubEvents?: CompetitionSubEvent[];
}
