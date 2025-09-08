import { SortableField, WhereField } from '@app/utils';
import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import { BaseEntity, Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, Relation, UpdateDateColumn } from 'typeorm';
import { CompetitionSubEvent } from './competition-sub-event.model';
import { LevelType } from '@app/models-enum';

@ObjectType('MetaEventCompetition', { description: 'Metadata for competition event' })
export class MetaEventCompetition {
  @Field(() => Int, { nullable: true })
  declare amountOfBasePlayers?: number;
}

@ObjectType('EventException', { description: 'Exception for event scheduling' })
export class EventException {
  @Field(() => Date, { nullable: true })
  declare start?: Date;

  @Field(() => Date, { nullable: true })
  declare end?: Date;

  @Field(() => Int, { nullable: true })
  declare courts?: number;
}

@ObjectType('InfoEvent', { description: 'Information event details' })
export class InfoEvent {
  @Field(() => Date, { nullable: true })
  declare start?: Date;

  @Field(() => Date, { nullable: true })
  declare end?: Date;

  @Field({ nullable: true })
  declare name?: string;

  @Field({ nullable: true })
  declare allowCompetition?: boolean;
}

@Entity('EventCompetitions', { schema: 'event' })
@ObjectType('CompetitionEvent', { description: 'A CompetitionEvent' })
export class CompetitionEvent extends BaseEntity {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  declare id: string;

  @SortableField()
  @WhereField()
  @CreateDateColumn({ type: 'timestamptz' })
  declare createdAt: Date;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @UpdateDateColumn({ type: 'timestamptz' })
  declare updatedAt: Date;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ type: 'character varying', length: 255, nullable: true })
  declare name: string;

  @SortableField(() => Int, { nullable: true })
  @WhereField(() => Int, { nullable: true })
  @Column({ type: 'integer', nullable: true })
  declare season: number;

  @SortableField(() => Date, { nullable: true })
  @WhereField(() => Date, { nullable: true })
  @Column({ type: 'timestamp with time zone', nullable: true })
  declare lastSync: Date;

  @SortableField(() => Date, { nullable: true })
  @WhereField(() => Date, { nullable: true })
  @Column({ type: 'timestamp with time zone', nullable: true })
  declare openDate?: Date;

  @SortableField(() => Date, { nullable: true })
  @WhereField(() => Date, { nullable: true })
  @Column({ type: 'timestamp with time zone', nullable: true })
  declare closeDate?: Date;

  @SortableField(() => Date, { nullable: true })
  @WhereField(() => Date, { nullable: true })
  @Column({ type: 'timestamp with time zone', nullable: true })
  declare changeOpenDate: Date;

  @SortableField(() => Date, { nullable: true })
  @Column({ type: 'timestamp with time zone', nullable: true })
  declare changeCloseDatePeriod1: Date;

  @SortableField(() => Date, { nullable: true })
  @Column({ type: 'timestamp with time zone', nullable: true })
  declare changeCloseRequestDatePeriod1: Date;

  @SortableField(() => Date, { nullable: true })
  @Column({ type: 'timestamp with time zone', nullable: true })
  declare changeCloseDatePeriod2: Date;

  @SortableField(() => Date, { nullable: true })
  @Column({ type: 'timestamp with time zone', nullable: true })
  declare changeCloseRequestDatePeriod2: Date;

  @SortableField(() => MetaEventCompetition, { nullable: true })
  @WhereField(() => MetaEventCompetition, { nullable: true })
  @Column({ type: 'json', nullable: true })
  declare meta?: MetaEventCompetition;

  @SortableField({ nullable: true })
  @Column({ type: 'character varying', length: 255, nullable: true })
  declare visualCode: string;

  @SortableField({ nullable: true })
  @Column({ type: 'character varying', length: 255, nullable: true })
  declare slug: string;

  @SortableField({ nullable: true })
  @Column({ type: 'character varying', length: 255, nullable: true })
  declare teamMatcher: string;

  @SortableField(() => Int)
  @WhereField(() => Int)
  @Column({ default: 4 })
  declare usedRankingAmount: number;

  @SortableField(() => String)
  @WhereField(() => String)
  @Column({ type: 'simple-enum', enum: ['months', 'weeks', 'days'], default: 'months' })
  declare usedRankingUnit: 'months' | 'weeks' | 'days';

  @SortableField(() => Boolean, { nullable: false })
  @Column({
    default: false,
  })
  declare official: boolean;

  @SortableField(() => String, { nullable: true })
  @Column({
    type: 'simple-enum',
    enum: LevelType,
    nullable: true
  })
  declare type: LevelType;

  @SortableField(() => Boolean, { nullable: false })
  @Column({
    default: false,
    nullable: false
  })
  declare checkEncounterForFilledIn: boolean;

  @SortableField({ nullable: true })
  @Column({ type: 'character varying', length: 255, nullable: true })
  declare state: string;

  @SortableField({ nullable: true })
  @Column({ type: 'character varying', length: 255, nullable: true })
  declare country: string;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ type: 'character varying', length: 255, nullable: true })
  declare contactEmail?: string;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ type: 'uuid', nullable: true })
  declare contactId?: string;

  @SortableField(() => [EventException], { nullable: true })
  @WhereField(() => [EventException], { nullable: true })
  @Column({ type: 'json', nullable: true })
  declare exceptions?: EventException[];

  @SortableField(() => [InfoEvent], { nullable: true })
  @WhereField(() => [InfoEvent], { nullable: true })
  @Column({ type: 'json', nullable: true })
  declare infoEvents?: InfoEvent[];

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ default: false })
  declare started?: boolean;

  @Field(() => [CompetitionSubEvent], { nullable: true })
  @OneToMany(() => CompetitionSubEvent, (subEvent) => subEvent.competitionEvent)
  declare competitionSubEvents?: Relation<CompetitionSubEvent[]>;
}
