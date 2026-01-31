import { Field, ID, Int, ObjectType, registerEnumType } from '@nestjs/graphql';
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Relation,
} from 'typeorm';
import { SortableField, WhereField } from '@app/utils';
import { Player } from '../../player.model';
import { TournamentEvent } from './tournament-event.model';
import { EnrollmentSessionItem } from './enrollment-session-item.model';

export enum EnrollmentSessionStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

registerEnumType(EnrollmentSessionStatus, {
  name: 'EnrollmentSessionStatus',
  description: 'Status of an enrollment session',
});

@ObjectType('EnrollmentSession', {
  description: 'A shopping cart session for multi-event tournament enrollment',
})
@Entity('EnrollmentSessions', { schema: 'event' })
export class EnrollmentSession extends BaseEntity {
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

  // Session identification
  @SortableField()
  @WhereField()
  @Column({ type: 'character varying', length: 255, unique: true })
  declare sessionKey: string;

  @Field(() => Player, { nullable: true })
  @ManyToOne(() => Player, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'playerId' })
  declare player?: Relation<Player>;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ nullable: true, type: 'uuid' })
  declare playerId?: string;

  // Session state
  @SortableField(() => String)
  @WhereField(() => String)
  @Column({ type: 'character varying', length: 50, default: 'PENDING' })
  declare status: EnrollmentSessionStatus;

  @SortableField(() => Date)
  @WhereField(() => Date)
  @Column({ type: 'timestamptz' })
  declare expiresAt: Date;

  // Metadata
  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ nullable: true, type: 'character varying', length: 45 })
  declare ipAddress?: string;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ nullable: true, type: 'text' })
  declare userAgent?: string;

  // Computed fields
  @SortableField(() => Int)
  @WhereField(() => Int)
  @Column({ type: 'integer', default: 0 })
  declare totalSubEvents: number;

  @SortableField(() => Date, { nullable: true })
  @WhereField(() => Date, { nullable: true })
  @Column({ nullable: true, type: 'timestamptz' })
  declare completedAt?: Date;

  // Relationships
  @Field(() => [EnrollmentSessionItem], { nullable: true })
  @OneToMany(() => EnrollmentSessionItem, (item) => item.session, {
    cascade: true,
    onDelete: 'CASCADE',
  })
  declare items?: Relation<EnrollmentSessionItem[]>;

  @Field(() => TournamentEvent, { nullable: true })
  @ManyToOne(() => TournamentEvent, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tournamentEventId' })
  declare tournamentEvent?: Relation<TournamentEvent>;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ nullable: true, type: 'uuid' })
  declare tournamentEventId?: string;
}
