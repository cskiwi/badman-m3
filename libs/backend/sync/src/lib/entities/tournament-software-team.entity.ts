import { Entity, BaseEntity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Relation } from 'typeorm';
import { Team } from '@app/models';

@Entity('TournamentSoftwareTeams', { schema: 'sync' })
export class TournamentSoftwareTeam extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  declare id: string;

  @CreateDateColumn({ type: 'timestamptz' })
  declare createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  declare updatedAt: Date;

  @Column()
  declare tournamentCode: string;

  @Column({ nullable: true })
  declare eventCode?: string;

  @Column()
  declare externalCode: string;

  @Column()
  declare externalName: string;

  @Column()
  declare normalizedName: string;

  @Column()
  declare clubName: string;

  @Column({ nullable: true })
  declare teamNumber?: number;

  @Column({ nullable: true })
  declare gender?: string;

  @Column({ nullable: true })
  declare strength?: number;

  @Column({ nullable: true })
  declare countryCode?: string;

  // Matching information
  @Column({ nullable: true })
  declare matchedTeamId?: string;

  @Column({ type: 'decimal', precision: 5, scale: 3, nullable: true })
  declare matchScore?: number;

  @Column({ nullable: true })
  declare matchType?: string; // 'automatic_high_confidence', 'automatic_medium_confidence', 'manual'

  @Column({ nullable: true })
  declare matchedAt?: Date;

  @Column({ default: false })
  declare isMatched: boolean;

  // Relations
  @ManyToOne(() => Team, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'matchedTeamId' })
  declare matchedTeam?: Relation<Team>;
}