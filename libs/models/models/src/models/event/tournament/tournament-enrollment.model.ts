import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
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
import { EnrollmentStatus } from '@app/models-enum';
import { TournamentSubEvent } from './tournament-sub-event.model';
import { Player } from '../../player.model';

@ObjectType('TournamentEnrollment', {
  description: 'A player enrollment in a tournament sub-event',
})
@Entity('TournamentEnrollments', { schema: 'event' })
@Index(['tournamentSubEventId', 'playerId'], { unique: true, where: '"playerId" IS NOT NULL' })
export class TournamentEnrollment extends BaseEntity {
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

  @SortableField(() => ID, { nullable: true })
  @WhereField(() => ID, { nullable: true })
  @Column({ nullable: false, type: 'uuid' })
  @Index()
  declare tournamentSubEventId: string;

  @SortableField(() => ID, { nullable: true })
  @WhereField(() => ID, { nullable: true })
  @Column({ nullable: true, type: 'uuid' })
  @Index()
  declare playerId?: string;

  @SortableField(() => String)
  @WhereField(() => String)
  @Column({
    type: 'simple-enum',
    enum: EnrollmentStatus,
    default: EnrollmentStatus.PENDING,
  })
  declare status: EnrollmentStatus;

  @SortableField(() => ID, { nullable: true })
  @WhereField(() => ID, { nullable: true })
  @Column({ nullable: true, type: 'uuid' })
  @Index()
  declare preferredPartnerId?: string;

  @SortableField(() => ID, { nullable: true })
  @WhereField(() => ID, { nullable: true })
  @Column({ nullable: true, type: 'uuid' })
  @Index()
  declare confirmedPartnerId?: string;

  @SortableField(() => Boolean)
  @WhereField(() => Boolean)
  @Column({ default: false })
  declare isGuest: boolean;

  @SortableField(() => String, { nullable: true })
  @WhereField(() => String, { nullable: true })
  @Column({ type: 'character varying', length: 255, nullable: true })
  declare guestName?: string;

  @SortableField(() => String, { nullable: true })
  @WhereField(() => String, { nullable: true })
  @Column({ type: 'character varying', length: 255, nullable: true })
  declare guestEmail?: string;

  @SortableField(() => String, { nullable: true })
  @WhereField(() => String, { nullable: true })
  @Column({ type: 'character varying', length: 50, nullable: true })
  declare guestPhone?: string;

  @SortableField(() => Int, { nullable: true })
  @WhereField(() => Int, { nullable: true })
  @Column({ nullable: true })
  declare waitingListPosition?: number;

  @Field(() => String, { nullable: true })
  @Column({ type: 'text', nullable: true })
  declare notes?: string;

  // Relations
  @Field(() => TournamentSubEvent, { nullable: true })
  @ManyToOne(() => TournamentSubEvent, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tournamentSubEventId' })
  declare tournamentSubEvent?: Relation<TournamentSubEvent>;

  @Field(() => Player, { nullable: true })
  @ManyToOne(() => Player, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'playerId' })
  declare player?: Relation<Player>;

  @Field(() => Player, { nullable: true })
  @ManyToOne(() => Player, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'preferredPartnerId' })
  declare preferredPartner?: Relation<Player>;

  @Field(() => Player, { nullable: true })
  @ManyToOne(() => Player, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'confirmedPartnerId' })
  declare confirmedPartner?: Relation<Player>;
}
