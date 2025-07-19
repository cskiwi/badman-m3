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

@ObjectType('CronJob', { description: 'Scheduled job configuration' })
@Entity('CronJobs')
export class CronJob extends BaseEntity {
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
  @Index({ unique: true })
  declare name: string;

  @SortableField({ nullable: true })
  @Column({ nullable: true })
  declare description?: string;

  @SortableField()
  @Column()
  declare cronExpression: string;

  @SortableField()
  @Column()
  declare jobFunction: string;

  @Field({ nullable: true })
  @SortableField({ nullable: true })
  @Column({ type: 'json', nullable: true })
  declare parameters?: string;

  @SortableField()
  @Column({ default: true })
  declare isActive: boolean;

  @SortableField({ nullable: true })
  @Column({ nullable: true })
  declare lastRun?: Date;

  @SortableField({ nullable: true })
  @Column({ nullable: true })
  declare nextRun?: Date;

  @SortableField({ nullable: true })
  @Column({ nullable: true })
  declare lastStatus?: string;

  @SortableField({ nullable: true })
  @Column({ type: 'text', nullable: true })
  declare lastError?: string;

  @SortableField({ nullable: true })
  @Column({ type: 'int', default: 0 })
  declare runCount?: number;

  @SortableField({ nullable: true })
  @Column({ type: 'int', default: 0 })
  declare failureCount?: number;
}