import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import { BaseEntity, Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn, Relation } from 'typeorm';
import { SortableField, WhereField } from '@app/utils';
import { TournamentDraw } from './tournament-draw.model';
import { TournamentEvent } from './tournament-event.model';

@ObjectType('TournamentSubEvent', {
  description: 'A TournamentSubEvent',
})
@Entity('SubEventTournaments', { schema: 'event' })
export class TournamentSubEvent extends BaseEntity {
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
  @Column({ nullable: true, type: 'character varying', length: 255 })
  declare name?: string;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ type: 'enum', enum: ['M', 'F', 'MX', 'MINIBAD'], nullable: true })
  declare eventType?: string;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ type: 'enum', enum: ['S', 'D', 'MX'], nullable: true })
  declare gameType?: string;

  @SortableField(() => Int, { nullable: true })
  @WhereField(() => Int, { nullable: true })
  @Column({ nullable: true })
  declare level?: number;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ nullable: true, type: 'character varying', length: 255 })
  declare visualCode?: string;

  @Field(() => [TournamentDraw], { nullable: true })
  @OneToMany(() => TournamentDraw, (tournamentDraw) => tournamentDraw.tournamentSubEvent, { cascade: true, onDelete: 'CASCADE' })
  declare drawTournaments?: Relation<TournamentDraw[]>;

  @Field(() => TournamentEvent, { nullable: true })
  @ManyToOne(() => TournamentEvent, (tournamentEvent) => tournamentEvent.tournamentSubEvents, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'eventId' })
  declare tournamentEvent?: Relation<TournamentEvent>;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ nullable: true, type: 'uuid' })
  declare eventId?: string;

  @SortableField(() => Date, { nullable: true })
  @WhereField(() => Date, { nullable: true })
  @Column({ nullable: true, type: 'timestamptz' })
  declare lastSync?: Date;

  // @Field(() => [EventEntry], { nullable: true })
  // @OneToMany(() => EventEntry, (eventEntry) => eventEntry.subEventTournament, { cascade: true, onDelete: 'CASCADE' })
  // eventEntries?: EventEntry[];
}
