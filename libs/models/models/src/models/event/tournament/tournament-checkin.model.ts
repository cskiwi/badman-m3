import { Field, ID, ObjectType } from '@nestjs/graphql';
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Relation,
  UpdateDateColumn,
} from 'typeorm';
import { SortableField, WhereField } from '@app/utils';
import { CheckInStatus } from '@app/models-enum';
import { TournamentEvent } from './tournament-event.model';
import { TournamentEnrollment } from './tournament-enrollment.model';
import { Player } from '../../player.model';

@ObjectType('TournamentCheckIn', {
  description: 'Record of a player checking in at a tournament',
})
@Entity('TournamentCheckIns', { schema: 'event' })
@Index(['tournamentEventId', 'enrollmentId'], { unique: true })
export class TournamentCheckIn extends BaseEntity {
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
  declare enrollmentId: string;

  @SortableField(() => Date, { nullable: true })
  @WhereField(() => Date, { nullable: true })
  @Column({ type: 'timestamptz', nullable: true })
  declare checkedInAt?: Date;

  @SortableField(() => ID, { nullable: true })
  @WhereField(() => ID, { nullable: true })
  @Column({ nullable: true, type: 'uuid' })
  declare checkedInById?: string;

  @SortableField(() => String)
  @WhereField(() => String)
  @Column({
    type: 'simple-enum',
    enum: CheckInStatus,
    default: CheckInStatus.PENDING,
  })
  declare status: CheckInStatus;

  @Field(() => String, { nullable: true })
  @Column({ type: 'text', nullable: true })
  declare notes?: string;

  // Relations
  @Field(() => TournamentEvent, { nullable: true })
  @ManyToOne(() => TournamentEvent, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tournamentEventId' })
  declare tournamentEvent?: Relation<TournamentEvent>;

  @Field(() => TournamentEnrollment, { nullable: true })
  @ManyToOne(() => TournamentEnrollment, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'enrollmentId' })
  declare enrollment?: Relation<TournamentEnrollment>;

  @Field(() => Player, { nullable: true })
  @ManyToOne(() => Player, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'checkedInById' })
  declare checkedInBy?: Relation<Player>;
}
