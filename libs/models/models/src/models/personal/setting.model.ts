import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import { BaseEntity, Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { SortableField, WhereField } from '@app/utils';

@ObjectType('Setting', { description: 'User notification and preference settings' })
@Entity('Settings', { schema: 'personal' })
export class Setting extends BaseEntity {
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
  declare playerId: string;

  @SortableField(() => String, { nullable: true })
  @WhereField(() => String, { nullable: true })
  @Column({ type: 'json', nullable: true })
  declare pushSubscriptions?: any;

  @SortableField(() => Int)
  @WhereField(() => Int)
  @Column({ type: 'integer' })
  declare encounterNotEnteredNotification: number;

  @SortableField(() => Int)
  @WhereField(() => Int)
  @Column({ type: 'integer' })
  declare encounterNotAcceptedNotification: number;

  @SortableField(() => Int)
  @WhereField(() => Int)
  @Column({ type: 'integer' })
  declare encounterChangeNewNotification: number;

  @SortableField(() => Int)
  @WhereField(() => Int)
  @Column({ type: 'integer' })
  declare encounterChangeConfirmationNotification: number;

  @SortableField(() => Int)
  @WhereField(() => Int)
  @Column({ type: 'integer' })
  declare encounterChangeFinishedNotification: number;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ type: 'character varying', length: 255, nullable: true, default: 'nl_BE' })
  declare language?: string;

  @SortableField(() => Int)
  @WhereField(() => Int)
  @Column({ type: 'integer', default: 0 })
  declare syncSuccessNotification: number;

  @SortableField(() => Int)
  @WhereField(() => Int)
  @Column({ type: 'integer', default: 0 })
  declare syncFailedNotification: number;

  @SortableField(() => Int)
  @WhereField(() => Int)
  @Column({ type: 'integer', default: 2 })
  declare clubEnrollmentNotification: number;

  @SortableField(() => Int)
  @WhereField(() => Int)
  @Column({ type: 'integer', default: 2 })
  declare synEncounterFailed: number;

  @SortableField(() => Int)
  @WhereField(() => Int)
  @Column({ type: 'integer', default: 2 })
  declare encounterHasCommentNotification: number;
}
