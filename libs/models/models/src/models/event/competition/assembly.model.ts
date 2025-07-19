import { Field, ID, ObjectType } from '@nestjs/graphql';
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
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
@Entity('CompetitionAssemblies', { schema: 'event' })
export class CompetitionAssembly extends BaseEntity {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  declare id: string;

  @SortableField()
  @CreateDateColumn()
  declare createdAt: Date;

  @SortableField({ nullable: true })
  @UpdateDateColumn({ nullable: true })
  declare updatedAt: Date;

  @Field(() => GraphQLJSONObject, { nullable: true })
  @Column({ type: 'json', nullable: true })
  declare assembly?: CompetitionAssemblyData;

  @Field({ nullable: true })
  @Column({ nullable: true })
  declare description?: string;

  @SortableField({ nullable: true })
  @Column({ nullable: true })
  declare encounterId?: string;

  @SortableField({ nullable: true })
  @Column({ nullable: true })
  declare teamId?: string;

  @SortableField({ nullable: true })
  @Column({ nullable: true })
  declare captainId?: string;

  @SortableField({ nullable: true })
  @Column({ nullable: true })
  declare playerId?: string;

  @Field(() => CompetitionEncounter, { nullable: true })
  @ManyToOne(() => CompetitionEncounter, { nullable: true, onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'encounterId' })
  declare encounterCompetition?: CompetitionEncounter;
}