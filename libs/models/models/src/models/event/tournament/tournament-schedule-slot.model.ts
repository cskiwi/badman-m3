import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  Relation,
  UpdateDateColumn,
} from 'typeorm';
import { SortableField, WhereField } from '@app/utils';
import { ScheduleSlotStatus } from '@app/models-enum';
import { TournamentEvent } from './tournament-event.model';
import { Court } from '../court.model';
import { Game } from '../game.model';

@ObjectType('TournamentScheduleSlot', {
  description: 'A time slot for scheduling games at a court',
})
@Entity('TournamentScheduleSlots', { schema: 'event' })
@Index(['tournamentEventId', 'courtId', 'startTime'])
export class TournamentScheduleSlot extends BaseEntity {
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

  @SortableField(() => ID)
  @WhereField(() => ID)
  @Column({ nullable: false, type: 'uuid' })
  @Index()
  declare tournamentEventId: string;

  @SortableField(() => ID)
  @WhereField(() => ID)
  @Column({ nullable: false, type: 'uuid' })
  @Index()
  declare courtId: string;

  @SortableField(() => Date)
  @WhereField(() => Date)
  @Column({ type: 'timestamptz', nullable: false })
  declare startTime: Date;

  @SortableField(() => Date)
  @WhereField(() => Date)
  @Column({ type: 'timestamptz', nullable: false })
  declare endTime: Date;

  @SortableField(() => ID, { nullable: true })
  @WhereField(() => ID, { nullable: true })
  @Column({ nullable: true, type: 'uuid' })
  @Index()
  declare gameId?: string;

  @SortableField(() => String)
  @WhereField(() => String)
  @Column({
    type: 'simple-enum',
    enum: ScheduleSlotStatus,
    default: ScheduleSlotStatus.AVAILABLE,
  })
  declare status: ScheduleSlotStatus;

  @SortableField(() => Int)
  @WhereField(() => Int)
  @Column({ default: 0 })
  declare order: number;

  // Relations
  @Field(() => TournamentEvent, { nullable: true })
  @ManyToOne(() => TournamentEvent, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tournamentEventId' })
  declare tournamentEvent?: Relation<TournamentEvent>;

  @Field(() => Court, { nullable: true })
  @ManyToOne(() => Court, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'courtId' })
  declare court?: Relation<Court>;

  @Field(() => Game, { nullable: true })
  @OneToOne(() => Game, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'gameId' })
  declare game?: Relation<Game>;
}
