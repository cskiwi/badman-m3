import { Field, ID, ObjectType } from '@nestjs/graphql';
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { SortableField, WhereField } from '@app/utils';

@ObjectType('LocationEventMembership', { description: 'Membership between location and event' })
@Entity('LocationEventTournaments', { schema: 'event' })
export class LocationEventMembership extends BaseEntity {
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

  @SortableField()
  @WhereField()
  @Column({ type: 'uuid' })
  @Index()
  declare locationId: string;

  @SortableField()
  @WhereField()
  @Column({ type: 'uuid' })
  @Index()
  declare eventId: string;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ default: true })
  declare isPrimary?: boolean;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ type: 'int', default: 0 })
  declare sortOrder?: number;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ default: true })
  declare isActive?: boolean;
}