import { Field, ID, ObjectType } from '@nestjs/graphql';
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  Relation,
  UpdateDateColumn,
} from 'typeorm';
import { SortableField } from '@app/utils';
import { CompetitionEncounterChangeDate as CompetitionEncounterChangeDate } from './encounter-change-date.model';

@ObjectType('CompetitionEncounterChange', { description: 'Changes made to a competition encounter' })
@Entity('CompetitionEncounterChanges')
export class CompetitionEncounterChange extends BaseEntity {
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
  @Index()
  declare encounterId: string;

  @SortableField()
  @Column()
  declare changeType: string;

  @SortableField({ nullable: true })
  @Column({ type: 'text', nullable: true })
  declare reason?: string;

  @SortableField({ nullable: true })
  @Column({ nullable: true })
  declare requestedBy?: string;

  @SortableField({ nullable: true })
  @Column({ nullable: true })
  declare approvedBy?: string;

  @SortableField({ nullable: true })
  @Column({ nullable: true })
  declare approvedAt?: Date;

  @SortableField()
  @Column({ default: 'pending' })
  declare status: string;

  @Field(() => [CompetitionEncounterChangeDate], { nullable: true })
  @OneToMany(() => CompetitionEncounterChangeDate, (changeDate) => changeDate.competitionEncounterChange)
  declare changeDates?: Relation<CompetitionEncounterChangeDate[]>;
}