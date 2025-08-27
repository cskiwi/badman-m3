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

@ObjectType('TournamentGroupSubEventMembership', { description: 'Membership between group and sub-event in tournament' })
@Entity('TournamentGroupSubEventMemberships')
export class TournamentGroupSubEventMembership extends BaseEntity {
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
  declare groupId: string;

  @SortableField()
  @WhereField()
  @Column({ type: 'uuid' })
  @Index()
  declare subEventId: string;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ type: 'int', default: 0 })
  declare sortOrder?: number;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ default: true })
  declare isActive?: boolean;
}