import { Entity, BaseEntity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('TeamMatchingReviews', { schema: 'sync' })
export class TeamMatchingReview extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  declare id: string;

  @CreateDateColumn({ type: 'timestamptz' })
  declare createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  declare updatedAt: Date;

  @Column()
  declare tournamentCode: string;

  @Column()
  declare externalTeamCode: string;

  @Column()
  declare externalTeamName: string;

  @Column({ type: 'json' })
  declare externalTeamData: any;

  @Column({ type: 'json', nullable: true })
  declare suggestions?: any[];

  @Column({ nullable: true })
  declare errorMessage?: string;

  @Column({ default: 'pending_review' })
  declare status: 'pending_review' | 'approved' | 'rejected' | 'resolved';

  @Column({ nullable: true })
  declare resolvedBy?: string;

  @Column({ nullable: true })
  declare resolvedAt?: Date;

  @Column({ nullable: true })
  declare resolution?: string; // 'matched_to_existing', 'created_new_team', 'ignored'

  @Column({ nullable: true })
  declare resolvedTeamId?: string;

  @Column({ nullable: true })
  declare notes?: string;
}