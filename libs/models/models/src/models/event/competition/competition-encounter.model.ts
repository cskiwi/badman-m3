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
  Relation,
} from 'typeorm';
import { SortableField, WhereField } from '@app/utils';
import { Game } from '../game.model';
import { CompetitionDraw } from './competition-draw.model';
import { Team } from '../../team.model';
import { CompetitionAssembly } from './competition-assembly.model';

@ObjectType('CompetitionEncounter', { description: 'A Competition Encounter' })
@Entity('EncounterCompetitions', { schema: 'event' })
export class CompetitionEncounter extends BaseEntity {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  declare id: string;

  @SortableField()
  @WhereField(() => Date)
  @CreateDateColumn()
  declare createdAt: Date;

  @SortableField({ nullable: true })
  @WhereField(() => Date, { nullable: true })
  @UpdateDateColumn({ nullable: true })
  declare updatedAt: Date;

  @SortableField({ nullable: true })
  @WhereField(() => Date, { nullable: true })
  @Column({ nullable: true })
  declare date?: Date;

  @SortableField({ nullable: true })
  @WhereField(() => Date, { nullable: true })
  @Column({ nullable: true })
  declare originalDate?: Date;

  @Field({ nullable: true })
  @Column({ nullable: true })
  declare visualCode?: string;

  @SortableField({ nullable: true })
  @WhereField(() => Number, { nullable: true })
  @Column({ nullable: true })
  declare homeScore?: number;

  @SortableField({ nullable: true })
  @WhereField(() => Number, { nullable: true })
  @Column({ nullable: true })
  declare awayScore?: number;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ nullable: true })
  declare drawId?: string;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ nullable: true })
  declare locationId?: string;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
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
  @WhereField({ nullable: true })
  @Column({ nullable: true })
  declare homeTeamId?: string;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ nullable: true })
  declare awayTeamId?: string;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ nullable: true })
  declare gameLeaderId?: string;

  @Field({ nullable: true })
  @Column({ nullable: true, default: false })
  declare homeCaptainPresent?: boolean;

  @Field({ nullable: true })
  @Column({ nullable: true, default: false })
  declare awayCaptainPresent?: boolean;

  @Field({ nullable: true })
  @Column({ nullable: true, default: false })
  declare gameLeaderPresent?: boolean;

  @Field({ nullable: true })
  @Column({ nullable: true, default: false })
  declare homeCaptainAccepted?: boolean;

  @Field({ nullable: true })
  @Column({ nullable: true, default: false })
  declare awayCaptainAccepted?: boolean;

  @Field({ nullable: true })
  @Column({ nullable: true, default: false })
  declare gameLeaderAccepted?: boolean;

  @Field(() => CompetitionDraw, { nullable: true })
  @ManyToOne(() => CompetitionDraw, { nullable: true, onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'drawId' })
  declare drawCompetition?: Relation<CompetitionDraw>;

  @Field(() => [Game], { nullable: true })
  @OneToMany(() => Game, (game) => game.competitionEncounter)
  declare games?: Relation<Game[]>;

  @OneToMany(() => CompetitionAssembly, (assembly) => assembly.encounterCompetition)
  declare assemblies?: Relation<CompetitionAssembly[]>;

  @Field(() => Team, { nullable: true })
  @ManyToOne(() => Team, { nullable: true, onDelete: 'SET NULL', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'homeTeamId' })
  declare homeTeam?: Relation<Team>;

  @Field(() => Team, { nullable: true })
  @ManyToOne(() => Team, { nullable: true, onDelete: 'SET NULL', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'awayTeamId' })
  declare awayTeam?: Relation<Team>;
}
