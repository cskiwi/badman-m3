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
  @CreateDateColumn({ type: 'timestamptz' })
  declare createdAt: Date;

  @SortableField({ nullable: true })
  @WhereField(() => Date, { nullable: true })
  @UpdateDateColumn({ type: 'timestamptz' })
  declare updatedAt: Date;

  @SortableField({ nullable: true })
  @WhereField(() => Date, { nullable: true })
  @Column({ nullable: true, type: 'timestamptz' })
  declare date?: Date;

  @SortableField({ nullable: true })
  @WhereField(() => Date, { nullable: true })
  @Column({ nullable: true, type: 'timestamptz' })
  declare originalDate?: Date;

  @Field({ nullable: true })
  @Column({ nullable: true, type: 'character varying', length: 255 })
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
  @Column({ nullable: true, type: 'uuid' })
  declare drawId?: string;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ nullable: true, type: 'uuid' })
  declare locationId?: string;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ nullable: true, type: 'uuid' })
  declare originalLocationId?: string;

  @Field({ nullable: true })
  @Column({ nullable: true, type: 'character varying', length: 255 })
  declare shuttle?: string;

  @Field({ nullable: true })
  @Column({ nullable: true, type: 'character varying', length: 255 })
  declare startHour?: string;

  @Field({ nullable: true })
  @Column({ nullable: true, type: 'character varying', length: 255 })
  declare endHour?: string;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ nullable: true, type: 'uuid' })
  declare homeTeamId?: string;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ nullable: true, type: 'uuid' })
  declare awayTeamId?: string;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ nullable: true, type: 'uuid' })
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

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ nullable: true, type: 'timestamptz' })
  declare synced?: Date;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ nullable: true, type: 'uuid' })
  declare enteredById?: string;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ nullable: true, type: 'uuid' })
  declare acceptedById?: string;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ nullable: true, type: 'timestamptz' })
  declare enteredOn?: Date;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ nullable: true, type: 'timestamptz' })
  declare acceptedOn?: Date;

  @SortableField()
  @WhereField()
  @Column({ default: false })
  declare accepted: boolean;

  @SortableField()
  @WhereField()
  @Column({ default: false })
  declare finished: boolean;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ nullable: true, type: 'uuid' })
  declare tempHomeCaptainId?: string;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ nullable: true, type: 'uuid' })
  declare tempAwayCaptainId?: string;

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
