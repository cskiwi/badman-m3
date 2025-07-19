import { SortableField } from '@app/utils';
import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import { BaseEntity, Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { TournamentSubEvent } from './tournament-sub-event.model';
import { Game } from '../game.model';

@Entity('DrawTournaments', { schema: 'event' })
@ObjectType('TournamentDraw', { description: 'A TournamentDraw' })
export class TournamentDraw extends BaseEntity {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  declare id: string;

  @SortableField()
  @CreateDateColumn()
  declare createdAt: Date;

  @SortableField({ nullable: true })
  @UpdateDateColumn({ nullable: true })
  declare updatedAt?: Date;

  @SortableField(() => String, { nullable: true })
  @Column({ type: 'varchar', nullable: true })
  declare name?: string;

  @SortableField(() => String, { nullable: true })
  @Column({ type: 'enum', enum: ['KO', 'POULE', 'QUALIFICATION'], nullable: true })
  declare type?: string;

  @SortableField(() => Int, { nullable: true })
  @Column({ type: 'int', nullable: true })
  declare size?: number;

  @Field(() => [Game], { nullable: true })
  @OneToMany(() => Game, (game) => game.tournamentDraw, { cascade: true })
  declare games?: Game[];

  // @Field(() => [EventEntry], { nullable: true })
  // @OneToMany(() => EventEntry, eventEntry => eventEntry.drawTournament, { cascade: true, onDelete: 'CASCADE' })
  // eventEntries?: EventEntry[];

  @SortableField(() => String, { nullable: true })
  @Column({ type: 'varchar', nullable: true })
  declare visualCode?: string;

  @SortableField(() => Int)
  @Column({ type: 'int', default: 0 })
  declare risers: number;

  @SortableField(() => Int)
  @Column({ type: 'int', default: 0 })
  declare fallers: number;

  @Field(() => TournamentSubEvent, { nullable: true })
  @ManyToOne(() => TournamentSubEvent, (tournamentSubEvent) => tournamentSubEvent.drawTournaments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'subeventId' })
  declare tournamentSubEvent?: TournamentSubEvent;

  @Field(() => ID, { nullable: true })
  @Column({ type: 'uuid', nullable: true })
  declare subeventId?: string;
}
