import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import { BaseEntity, Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn, Relation } from 'typeorm';
import { SortableField, WhereField } from '@app/utils';
import { TournamentDraw } from './tournament-draw.model';
import { TournamentEvent } from './tournament-event.model';
import { SubEventTypeEnum, GameType } from '@app/models-enum';

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

  @SortableField(() => String, { nullable: true })
  @WhereField(() => String, { nullable: true })
  @Column({ type: 'simple-enum', enum: SubEventTypeEnum, nullable: true })
  declare eventType?: SubEventTypeEnum;

  @SortableField(() => String, { nullable: true })
  @WhereField(() => String, { nullable: true })
  @Column({ type: 'simple-enum', enum: GameType, nullable: true })
  declare gameType?: GameType;

  @SortableField(() => Int, { nullable: true })
  @WhereField(() => Int, { nullable: true })
  @Column({ nullable: true })
  declare minLevel?: number;

  @SortableField(() => Int, { nullable: true })
  @WhereField(() => Int, { nullable: true })
  @Column({ nullable: true })
  declare maxLevel?: number;

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

  // API fields from Tournament Software XML <TournamentEvent> elements
  @SortableField(() => Int, { nullable: true })
  @WhereField(() => Int, { nullable: true })
  @Column({ type: 'integer', nullable: true })
  declare levelId?: number; // For tournaments only

  @SortableField(() => Int, { nullable: true })
  @WhereField(() => Int, { nullable: true })
  @Column({ type: 'integer', nullable: true })
  declare genderId?: number; // 1=Men, 2=Women, 3=Mixed

  @SortableField(() => Int, { nullable: true })
  @WhereField(() => Int, { nullable: true })
  @Column({ type: 'integer', nullable: true })
  declare gameTypeId?: number; // 1=Singles, 2=Doubles

  @SortableField(() => Int, { nullable: true })
  @WhereField(() => Int, { nullable: true })
  @Column({ type: 'integer', nullable: true })
  declare paraClassId?: number; // 0=Standard

  // Tournament management fields
  @SortableField(() => Int, { nullable: true })
  @WhereField(() => Int, { nullable: true })
  @Column({ nullable: true })
  declare maxEntries?: number;

  @SortableField(() => Boolean)
  @WhereField(() => Boolean)
  @Column({ default: true })
  declare waitingListEnabled: boolean;

  // @Field(() => [EventEntry], { nullable: true })
  // @OneToMany(() => EventEntry, (eventEntry) => eventEntry.subEventTournament, { cascade: true, onDelete: 'CASCADE' })
  // eventEntries?: EventEntry[];
}
