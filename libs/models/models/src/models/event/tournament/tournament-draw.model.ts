import { SortableField, WhereField } from '@app/utils';
import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import { BaseEntity, Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn, Relation } from 'typeorm';
import { TournamentSubEvent } from './tournament-sub-event.model';
import { Game } from '../game.model';
import { Entry } from '../entry.model';

@Entity('DrawTournaments', { schema: 'event' })
@ObjectType('TournamentDraw', { description: 'A TournamentDraw' })
export class TournamentDraw extends BaseEntity {
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
  declare updatedAt?: Date;

  @SortableField(() => String, { nullable: true })
  @WhereField(() => String, { nullable: true })
  @Column({ type: 'character varying', length: 255, nullable: true })
  declare name?: string;

  @SortableField(() => String, { nullable: true })
  @WhereField(() => String, { nullable: true })
  @Column({ type: 'character varying', length: 255, nullable: true })
  declare visualCode?: string;

  @SortableField(() => String, { nullable: true })
  @WhereField(() => String, { nullable: true })
  @Column({ type: 'enum', enum: ['KO', 'POULE', 'QUALIFICATION'], nullable: true })
  declare type?: string;

  @SortableField(() => Int, { nullable: true })
  @WhereField(() => Int, { nullable: true })
  @Column({ type: 'int', nullable: true })
  declare size?: number;

  @Field(() => [Game], { nullable: true })
  @OneToMany(() => Game, (game) => game.tournamentDraw, { cascade: true })
  declare games?: Relation<Game[]>;

  @Field(() => [Entry], { nullable: true })
  declare entries?: Entry[];

  // @Field(() => [EventEntry], { nullable: true })
  // @OneToMany(() => EventEntry, eventEntry => eventEntry.drawTournament, { cascade: true, onDelete: 'CASCADE' })
  // eventEntries?: EventEntry[];


  @SortableField(() => Int)
  @WhereField(() => Int)
  @Column({ type: 'int', default: 0 })
  declare risers: number;

  @SortableField(() => Int)
  @WhereField(() => Int)
  @Column({ type: 'int', default: 0 })
  declare fallers: number;

  @Field(() => TournamentSubEvent, { nullable: true })
  @ManyToOne(() => TournamentSubEvent, (tournamentSubEvent) => tournamentSubEvent.drawTournaments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'subeventId' })
  declare tournamentSubEvent?: Relation<TournamentSubEvent>;

  @SortableField(() => ID, { nullable: true })
  @WhereField(() => ID, { nullable: true })
  @Column({ type: 'uuid', nullable: true })
  declare subeventId?: string;

  @SortableField(() => Date, { nullable: true })
  @WhereField(() => Date, { nullable: true })
  @Column({ nullable: true })
  declare lastSync?: Date;
}
