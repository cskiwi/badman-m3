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
import { SortableField } from '@app/utils';

@ObjectType('LocationEventMembership', { description: 'Membership between location and event' })
@Entity('LocationEventMemberships')
export class LocationEventMembership extends BaseEntity {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  declare id: string;

  @SortableField()
  @CreateDateColumn()
  declare createdAt: Date;

  @SortableField({ nullable: true })
  @UpdateDateColumn({ nullable: true })
  declare updatedAt: Date;

  @SortableField()
  @Column()
  @Index()
  declare locationId: string;

  @SortableField()
  @Column()
  @Index()
  declare eventId: string;

  @SortableField({ nullable: true })
  @Column({ default: true })
  declare isPrimary?: boolean;

  @SortableField({ nullable: true })
  @Column({ type: 'int', default: 0 })
  declare sortOrder?: number;

  @SortableField({ nullable: true })
  @Column({ default: true })
  declare isActive?: boolean;
}