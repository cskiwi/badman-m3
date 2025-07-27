import { Entity, BaseEntity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('SyncJobLogs', { schema: 'sync' })
export class SyncJobLog extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  declare id: string;

  @CreateDateColumn()
  declare createdAt: Date;

  @Column()
  declare jobType: string;

  @Column()
  declare jobId: string;

  @Column({ nullable: true })
  declare tournamentCode?: string;

  @Column({ nullable: true })
  declare eventCode?: string;

  @Column({ default: 'pending' })
  declare status: 'pending' | 'in_progress' | 'completed' | 'failed';

  @Column({ nullable: true })
  declare startedAt?: Date;

  @Column({ nullable: true })
  declare completedAt?: Date;

  @Column({ nullable: true })
  declare errorMessage?: string;

  @Column({ type: 'text', nullable: true })
  declare errorStack?: string;

  @Column({ type: 'json', nullable: true })
  declare jobData?: any;

  @Column({ type: 'json', nullable: true })
  declare result?: any;

  @Column({ default: 0 })
  declare processingTimeMs: number;

  @Column({ default: 0 })
  declare itemsProcessed: number;
}