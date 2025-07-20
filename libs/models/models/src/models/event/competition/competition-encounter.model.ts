import { Field, ID, ObjectType } from '@nestjs/graphql';
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { SortableField } from '@app/utils';
import { Game } from '../game.model';
import { CompetitionDraw } from './competition-draw.model';
import { CompetitionAssembly as Assembly } from './assembly.model';
import { Team } from '../../team.model';

@ObjectType('CompetitionEncounter', { description: 'A Competition Encounter' })
@Entity('EncounterCompetitions', { schema: 'event' })
export class CompetitionEncounter extends BaseEntity {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  declare id: string;

  @SortableField()
  @CreateDateColumn()
  declare createdAt: Date;

  @SortableField({ nullable: true })
  @UpdateDateColumn({ nullable: true })
  declare updatedAt: Date;

  @SortableField({ nullable: true })
  @Column({ nullable: true })
  declare date?: Date;

  @SortableField({ nullable: true })
  @Column({ nullable: true })
  declare originalDate?: Date;

  @Field({ nullable: true })
  @Column({ nullable: true })
  declare visualCode?: string;

  @SortableField({ nullable: true })
  @Column({ nullable: true })
  declare homeScore?: number;

  @SortableField({ nullable: true })
  @Column({ nullable: true })
  declare awayScore?: number;

  @SortableField({ nullable: true })
  @Column({ nullable: true })
  declare drawId?: string;

  @SortableField({ nullable: true })
  @Column({ nullable: true })
  declare locationId?: string;

  @SortableField({ nullable: true })
  @Column({ nullable: true })
  declare originalLocationId?: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  declare shuttle?: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  declare startHour?: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  declare endHour?: string;

  @SortableField({ nullable: true })
  @Column({ nullable: true })
  declare homeTeamId?: string;

  @SortableField({ nullable: true })
  @Column({ nullable: true })
  declare awayTeamId?: string;

  @SortableField({ nullable: true })
  @Column({ nullable: true })
  declare gameLeaderId?: string;

  @Field(() => CompetitionDraw, { nullable: true })
  @ManyToOne(() => CompetitionDraw, { nullable: true, onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'drawId' })
  declare drawCompetition?: CompetitionDraw;

  @Field(() => [Game], { nullable: true })
  @OneToMany(() => Game, (game) => game.competitionEncounter)
  declare games?: Game[];

  @OneToMany(() => Assembly, (assembly) => assembly.encounterCompetition)
  declare assemblies?: Assembly[];

  @Field(() => Team, { nullable: true })
  @ManyToOne(() => Team, { nullable: true, onDelete: 'SET NULL', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'homeTeamId' })
  declare homeTeam?: Team;

  @Field(() => Team, { nullable: true })
  @ManyToOne(() => Team, { nullable: true, onDelete: 'SET NULL', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'awayTeamId' })
  declare awayTeam?: Team;
}