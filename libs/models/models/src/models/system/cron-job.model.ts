import { Field, ID, ObjectType } from '@nestjs/graphql';
import { BaseEntity, Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { SortableField, WhereField } from '@app/utils';

@ObjectType('CronJob', { description: 'Scheduled job configuration' })
@Entity('CronJobs')
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

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ nullable: true, type: 'character varying', length: 255 })
  declare description?: string;

  @SortableField()
  @WhereField()
  @Column({ type: 'character varying', length: 255 })
  declare cronExpression: string;

  @SortableField()
  @WhereField()
  @Column({ type: 'character varying', length: 255 })
  declare jobFunction: string;

  @Field({ nullable: true })
  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ type: 'json', nullable: true })
  declare parameters?: string;

  @SortableField()
  @WhereField()
  @Column({ default: true })
  declare isActive: boolean;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ nullable: true, type: 'timestamptz' })
  declare lastRun?: Date;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ nullable: true, type: 'timestamptz' })
  declare nextRun?: Date;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ nullable: true, type: 'character varying', length: 255 })
  declare lastStatus?: string;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ type: 'text', nullable: true })
  declare lastError?: string;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ type: 'int', default: 0 })
  declare runCount?: number;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ type: 'int', default: 0 })
  declare failureCount?: number;
}
