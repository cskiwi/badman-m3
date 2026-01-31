import { Field, ID, ObjectType, registerEnumType } from '@nestjs/graphql';
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Relation,
} from 'typeorm';
import { SortableField, WhereField } from '@app/utils';
import { Player } from '../../player.model';
import { TournamentSubEvent } from './tournament-sub-event.model';
import { EnrollmentSession } from './enrollment-session.model';

export enum ItemValidationStatus {
  PENDING = 'PENDING',
  VALID = 'VALID',
  INVALID_CAPACITY = 'INVALID_CAPACITY',
  INVALID_LEVEL = 'INVALID_LEVEL',
  INVALID_PARTNER = 'INVALID_PARTNER',
  INVALID_SCHEDULE = 'INVALID_SCHEDULE',
  ENROLLMENT_CLOSED = 'ENROLLMENT_CLOSED',
  ALREADY_ENROLLED = 'ALREADY_ENROLLED',
}

registerEnumType(ItemValidationStatus, {
  name: 'ItemValidationStatus',
  description: 'Validation status for enrollment cart items',
});

@ObjectType('EnrollmentSessionItem', {
  description: 'A single sub-event selection within an enrollment cart',
})
@Entity('EnrollmentSessionItems', { schema: 'event' })
export class EnrollmentSessionItem extends BaseEntity {
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

  // Relationships
  @Field(() => EnrollmentSession)
  @ManyToOne(() => EnrollmentSession, (session) => session.items, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'sessionId' })
  declare session: Relation<EnrollmentSession>;

  @SortableField()
  @WhereField()
  @Column({ type: 'uuid' })
  declare sessionId: string;

  @Field(() => TournamentSubEvent)
  @ManyToOne(() => TournamentSubEvent, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tournamentSubEventId' })
  declare tournamentSubEvent: Relation<TournamentSubEvent>;

  @SortableField()
  @WhereField()
  @Column({ type: 'uuid' })
  declare tournamentSubEventId: string;

  // Doubles partner info
  @Field(() => Player, { nullable: true })
  @ManyToOne(() => Player, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'preferredPartnerId' })
  declare preferredPartner?: Relation<Player>;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ nullable: true, type: 'uuid' })
  declare preferredPartnerId?: string;

  // Guest enrollment info
  @SortableField(() => Boolean)
  @WhereField(() => Boolean)
  @Column({ default: false })
  declare isGuestEnrollment: boolean;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ nullable: true, type: 'character varying', length: 255 })
  declare guestName?: string;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ nullable: true, type: 'character varying', length: 255 })
  declare guestEmail?: string;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ nullable: true, type: 'character varying', length: 50 })
  declare guestPhone?: string;

  // Validation state
  @SortableField(() => String)
  @WhereField(() => String)
  @Column({ type: 'character varying', length: 50, default: 'PENDING' })
  declare validationStatus: ItemValidationStatus;

  @Field(() => String, { nullable: true })
  @Column({ nullable: true, type: 'jsonb' })
  declare validationErrors?: string; // JSONB stored as string

  // Notes
  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ nullable: true, type: 'text' })
  declare notes?: string;
}
