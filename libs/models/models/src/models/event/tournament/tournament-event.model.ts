import { SortableField, WhereField } from '@app/utils';
import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import { Entity, BaseEntity, CreateDateColumn, PrimaryGeneratedColumn, UpdateDateColumn, Column, OneToMany, Relation } from 'typeorm';
import { TournamentSubEvent } from './tournament-sub-event.model';

@Entity('EventTournaments', { schema: 'event' })
@ObjectType('TournamentEvent', { description: 'A TournamentEvent' })
export class TournamentEvent extends BaseEntity {
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

  @SortableField(() => String, { nullable: true })
  @WhereField(() => String, { nullable: true })
  @Column({ type: 'character varying', length: 255, nullable: true })
  declare tournamentNumber?: string;

  @SortableField(() => String, { nullable: true })
  @WhereField(() => String, { nullable: true })
  @Column({ type: 'character varying', length: 255, nullable: true })
  declare name?: string;

  @SortableField(() => Date, { nullable: true })
  @WhereField(() => Date, { nullable: true })
  @Column({ nullable: true, type: 'timestamptz' })
  declare firstDay?: Date;

  @SortableField(() => Date, { nullable: true })
  @WhereField(() => Date, { nullable: true })
  @Column({ nullable: true, type: 'timestamptz' })
  declare lastSync: Date;

  @SortableField(() => Date, { nullable: true })
  @WhereField(() => Date, { nullable: true })
  @Column({ nullable: true, type: 'timestamptz' })
  declare openDate?: Date;

  @SortableField(() => Date, { nullable: true })
  @WhereField(() => Date, { nullable: true })
  @Column({ nullable: true, type: 'timestamptz' })
  declare closeDate?: Date;

  @SortableField(() => String, { nullable: true })
  @WhereField(() => String, { nullable: true })
  @Column({ type: 'text', nullable: true })
  declare dates?: string;

  @SortableField(() => String, { nullable: true })
  @WhereField(() => String, { nullable: true })
  @Column({ type: 'character varying', length: 255, nullable: true })
  declare visualCode?: string;

  @SortableField(() => String, { nullable: true })
  @WhereField(() => String, { nullable: true })
  @Column({ type: 'character varying', length: 255, nullable: true })
  declare slug?: string;

  @SortableField(() => Int, { nullable: true })
  @WhereField(() => Int, { nullable: true })
  @Column({ nullable: true, default: 4 })
  declare usedRankingAmount?: number;

  @SortableField(() => String, { nullable: true })
  @WhereField(() => String, { nullable: true })
  @Column({ type: 'simple-enum', enum: ['months', 'weeks', 'days'], nullable: true, default: 'months' })
  declare usedRankingUnit?: 'months' | 'weeks' | 'days';

  @SortableField(() => Boolean)
  @WhereField(() => Boolean)
  @Column({ default: false })
  declare official: boolean;

  @SortableField(() => String, { nullable: true })
  @WhereField(() => String, { nullable: true })
  @Column({ type: 'character varying', length: 255, nullable: true })
  declare state?: string;

  @SortableField(() => String, { nullable: true })
  @WhereField(() => String, { nullable: true })
  @Column({ type: 'character varying', length: 255, nullable: true })
  declare country?: string;

  @OneToMany(() => TournamentSubEvent, (tournamentSubEvent) => tournamentSubEvent.tournamentEvent, { cascade: true, onDelete: 'CASCADE' })
  declare tournamentSubEvents?: Relation<TournamentSubEvent[]>;
}
