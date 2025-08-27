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

@ObjectType('CompetitionGroupSubEventMembership', { description: 'Membership between group and sub-event in competition' })
@Entity('CompetitionGroupSubEventMemberships')
export class CompetitionGroupSubEventMembership extends BaseEntity {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  declare id: string;

  @SortableField()
  @CreateDateColumn({ type: 'timestamptz' })
  declare createdAt: Date;

  @SortableField({ nullable: true })
  @UpdateDateColumn({ type: 'timestamptz' })
  declare updatedAt: Date;

  @SortableField()
  @Column({ type: 'uuid' })
  @Index()
  declare groupId: string;

  @SortableField()
  @Column({ type: 'uuid' })
  @Index()
  declare subEventId: string;

  @SortableField({ nullable: true })
  @Column({ type: 'int', default: 0 })
  declare sortOrder?: number;

  @SortableField({ nullable: true })
  @Column({ default: true })
  declare isActive?: boolean;
}