import { Field, ID, ObjectType } from '@nestjs/graphql';
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Relation,
  UpdateDateColumn,
} from 'typeorm';
import { SortableField } from '@app/utils';
import { CompetitionEncounter } from './competition-encounter.model';
import { GraphQLJSONObject } from 'graphql-type-json';

export interface CompetitionAssemblyData {
  single1?: string;
  single2?: string;
  single3?: string;
  single4?: string;
  double1?: string[];
  double2?: string[];
  double3?: string[];
  double4?: string[];
  substitutes?: string[];
}

@ObjectType('CompetitionAssembly', { description: 'A Team Assembly in Competition' })
@Entity('Assemblies', { schema: 'personal' })
export class CompetitionAssembly extends BaseEntity {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  declare id: string;

  @SortableField()
  @CreateDateColumn({ type: 'timestamptz' })
  declare createdAt: Date;

  @SortableField({ nullable: true })
  @UpdateDateColumn({ type: 'timestamptz' })
  declare updatedAt: Date;

  @Field(() => GraphQLJSONObject, { nullable: true })
  @Column({ type: 'json', nullable: true })
  declare assembly?: CompetitionAssemblyData;

  @Field({ nullable: true })
  @Column({ nullable: true, type: 'text' })
  declare description?: string;

  @SortableField({ nullable: true })
  @Column({ nullable: true, type: 'uuid' })
  declare encounterId?: string;

  @SortableField({ nullable: true })
  @Column({ nullable: true, type: 'uuid' })
  declare teamId?: string;

  @SortableField({ nullable: true })
  @Column({ nullable: true, type: 'uuid' })
  declare captainId?: string;

  @SortableField({ nullable: true })
  @Column({ nullable: true, type: 'uuid' })
  declare playerId?: string;

  @Field({ nullable: true })
  @Column({ nullable: true, default: false })
  declare isComplete?: boolean;

  @Field(() => CompetitionEncounter, { nullable: true })
  @ManyToOne(() => CompetitionEncounter, { nullable: true, onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'encounterId' })
  declare encounterCompetition?: Relation<CompetitionEncounter>;
}