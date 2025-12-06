import { Field, ID, ObjectType } from '@nestjs/graphql';
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Relation,
  OneToOne,
} from 'typeorm';
import { SortableField, WhereField } from '@app/utils';
import { Standing } from './standing.model';
import { EntryMeta } from './entry-meta.type';
import { Player } from '../player.model';
import { Team } from '../team.model';
import { TournamentDraw, TournamentSubEvent } from './tournament';
import { CompetitionDraw, CompetitionSubEvent } from './competition';

@ObjectType('Entry', { description: 'Player or team entry in an event' })
@Entity('Entries', { schema: 'event' })
export class Entry extends BaseEntity {
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
  @Column({ nullable: true, type: 'uuid' })
  @Index()
  declare subEventId?: string;

  @SortableField(() => ID, { nullable: true })
  @WhereField(() => ID, { nullable: true })
  @Column({ nullable: true, type: 'uuid' })
  @Index()
  declare drawId?: string;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ nullable: true, type: 'uuid' })
  @Index()
  declare player1Id?: string;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ nullable: true, type: 'uuid' })
  @Index()
  declare player2Id?: string;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ nullable: true, type: 'uuid' })
  @Index()
  declare teamId?: string;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ type: 'character varying', length: 255, nullable: true })
  declare entryType?: string;

  @SortableField(() => EntryMeta, { nullable: true })
  @WhereField(() => EntryMeta, { nullable: true })
  @Field(() => EntryMeta, { nullable: true })
  @Column({ type: 'json', nullable: true })
  declare meta?: EntryMeta;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ type: 'timestamp with time zone', nullable: true })
  declare date?: Date;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ type: 'timestamp with time zone', nullable: true })
  declare sendOn?: Date;

  @Field(() => Standing, { nullable: true })
  @OneToOne(() => Standing, (standing) => standing.entry)
  declare standing?: Relation<Standing>;

  @Field(() => Player, { nullable: true })
  @ManyToOne(() => Player, { nullable: true })
  @JoinColumn({ name: 'player1Id' })
  declare player1?: Relation<Player>;

  @Field(() => Player, { nullable: true })
  @ManyToOne(() => Player, { nullable: true })
  @JoinColumn({ name: 'player2Id' })
  declare player2?: Relation<Player>;

  @Field(() => Team, { nullable: true })
  @ManyToOne(() => Team, { nullable: true })
  @JoinColumn({ name: 'teamId' })
  declare team?: Relation<Team>;

  @Field(() => TournamentSubEvent, { nullable: true })
  @ManyToOne(() => TournamentSubEvent, { nullable: true, createForeignKeyConstraints: false })
  @JoinColumn({ name: 'subEventId' })
  declare tournamentSubEvent?: Relation<TournamentSubEvent>;

  @Field(() => CompetitionSubEvent, { nullable: true })
  @ManyToOne(() => CompetitionSubEvent, { nullable: true, createForeignKeyConstraints: false })
  @JoinColumn({ name: 'subEventId' })
  declare competitionSubEvent?: Relation<CompetitionSubEvent>;

  @Field(() => TournamentDraw, { nullable: true })
  @ManyToOne(() => TournamentDraw, { nullable: true, createForeignKeyConstraints: false })
  @JoinColumn({ name: 'drawId' })
  declare tournamentDraw?: Relation<TournamentDraw>;

  @Field(() => CompetitionDraw, { nullable: true })
  @ManyToOne(() => CompetitionDraw, { nullable: true, createForeignKeyConstraints: false })
  @JoinColumn({ name: 'drawId' })
  declare competitionDraw?: Relation<CompetitionDraw>;
}
