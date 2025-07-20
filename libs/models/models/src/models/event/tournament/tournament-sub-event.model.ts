import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import { BaseEntity, Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
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
  @CreateDateColumn()
  declare createdAt: Date;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @UpdateDateColumn({ nullable: true })
  declare updatedAt: Date;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ nullable: true })
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
  @Column({ nullable: true })
  declare visualCode?: string;

  @Field(() => [TournamentDraw], { nullable: true })
  @OneToMany(() => TournamentDraw, (tournamentDraw) => tournamentDraw.tournamentSubEvent, { cascade: true, onDelete: 'CASCADE' })
  declare drawTournaments?: TournamentDraw[];

  @Field(() => TournamentEvent, { nullable: true })
  @ManyToOne(() => TournamentEvent, (tournamentEvent) => tournamentEvent.tournamentSubEvents, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'eventId' })
  declare tournamentEvent?: TournamentEvent;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ nullable: true })
  declare eventId?: string;

  // @Field(() => [EventEntry], { nullable: true })
  // @OneToMany(() => EventEntry, (eventEntry) => eventEntry.subEventTournament, { cascade: true, onDelete: 'CASCADE' })
  // eventEntries?: EventEntry[];
}
