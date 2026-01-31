import { Field, ID, Int, ObjectType, registerEnumType } from '@nestjs/graphql';
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Relation,
} from 'typeorm';
import { SortableField, WhereField } from '@app/utils';
import { TournamentEnrollment } from './tournament-enrollment.model';
import { TournamentSubEvent } from './tournament-sub-event.model';

enum WaitingListAction {
  ADDED = 'ADDED',
  PROMOTED = 'PROMOTED',
  POSITION_CHANGED = 'POSITION_CHANGED',
  REMOVED = 'REMOVED',
}

registerEnumType(WaitingListAction, {
  name: 'WaitingListAction',
  description: 'Actions that can occur on a waiting list',
});

@ObjectType('WaitingListLog', {
  description: 'Audit log for waiting list movements',
})
@Entity('WaitingListLogs', { schema: 'event' })
export class WaitingListLog extends BaseEntity {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  declare id: string;

  @SortableField()
  @WhereField()
  @CreateDateColumn({ type: 'timestamptz' })
  declare createdAt: Date;

  // Relationships
  @Field(() => TournamentEnrollment)
  @ManyToOne(() => TournamentEnrollment, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'enrollmentId' })
  declare enrollment: Relation<TournamentEnrollment>;

  @SortableField()
  @WhereField()
  @Column({ type: 'uuid' })
  declare enrollmentId: string;

  @Field(() => TournamentSubEvent)
  @ManyToOne(() => TournamentSubEvent, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tournamentSubEventId' })
  declare tournamentSubEvent: Relation<TournamentSubEvent>;

  @SortableField()
  @WhereField()
  @Column({ type: 'uuid' })
  declare tournamentSubEventId: string;

  // Change tracking
  @SortableField(() => String)
  @WhereField(() => String)
  @Column({ type: 'character varying', length: 50 })
  declare action: WaitingListAction;

  @SortableField(() => Int, { nullable: true })
  @WhereField(() => Int, { nullable: true })
  @Column({ nullable: true, type: 'integer' })
  declare previousPosition?: number;

  @SortableField(() => Int, { nullable: true })
  @WhereField(() => Int, { nullable: true })
  @Column({ nullable: true, type: 'integer' })
  declare newPosition?: number;

  // Metadata
  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ nullable: true, type: 'character varying', length: 50 })
  declare triggeredBy?: string;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ nullable: true, type: 'text' })
  declare notes?: string;
}
