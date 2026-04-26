import { Field, ID, InputType, Int, ObjectType, OmitType, PartialType } from '@nestjs/graphql';
import { BaseEntity, Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { SortableField, WhereField } from '@app/utils';

@ObjectType('CronJobMeta', { description: 'Cron job meta data' })
export class CronJobMetaType {
  @Field(() => String, { nullable: true })
  jobName?: string;

  @Field(() => String, { nullable: true })
  queueName?: string;

  @Field(() => String, { nullable: true })
  arguments?: string;
}

@InputType()
export class CronJobMetaInputType extends PartialType(OmitType(CronJobMetaType, [] as const), InputType) {}

export interface CronJobMeta {
  jobName: string;
  queueName: string;
  arguments?: Record<string, unknown>;
}

@ObjectType('CronJob', { description: 'Cron job' })
@Entity('CronJobs', { schema: 'system' })
export class CronJob extends BaseEntity {
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
  @Column({ type: 'character varying', length: 255 })
  @Index({ unique: true })
  declare name: string;

  @SortableField()
  @WhereField()
  @Column({ type: 'character varying', length: 255 })
  declare type: 'ranking' | 'sync';

  @SortableField()
  @WhereField()
  @Column({ type: 'character varying', length: 255 })
  declare cronTime: string;

  @Field(() => CronJobMetaType, { nullable: true })
  @Column({ type: 'json', nullable: true })
  declare meta?: CronJobMeta;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ nullable: true, type: 'timestamptz' })
  declare lastRun?: Date;

  @SortableField()
  @WhereField()
  @Column({ default: false })
  declare active: boolean;

  @Field(() => Int, { nullable: true })
  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ type: 'int', default: 0 })
  declare amount: number;
}

@InputType()
export class CronJobUpdateInput extends PartialType(OmitType(CronJob, ['createdAt', 'updatedAt', 'meta'] as const), InputType) {}

@InputType()
export class CronJobNewInput extends PartialType(OmitType(CronJobUpdateInput, ['id'] as const), InputType) {}
