import { SortableField } from '@app/utils';
import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import { BaseEntity, Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Game } from '../game.model';
import { SubEventTournament } from './tournament-sub-event.model';

@Entity('DrawTournaments', { schema: 'event' })
@ObjectType('DrawTournament', { description: 'A DrawTournament' })
export class DrawTournament extends BaseEntity {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  declare id: string;

  @SortableField(() => Date, { nullable: true })
  @Column({ type: 'timestamp', nullable: true })
  declare updatedAt?: Date;

  @SortableField(() => Date, { nullable: true })
  @Column({ type: 'timestamp', nullable: true })
  declare createdAt?: Date;

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
  @OneToMany(() => Game, (game) => game.tournament, { cascade: true })
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

  @ManyToOne(() => SubEventTournament, (subEventTournament) => subEventTournament.drawTournaments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'subeventId' })
  declare subEventTournament?: SubEventTournament;

  @Field(() => ID, { nullable: true })
  @Column({ type: 'uuid', nullable: true })
  declare subeventId?: string;
}
