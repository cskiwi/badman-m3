import { Field, ID, ObjectType } from '@nestjs/graphql';
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  Relation,
  UpdateDateColumn,
} from 'typeorm';
import { SortableField } from '@app/utils';
import { CompetitionEncounterChange } from './encounter-change.model';

@ObjectType('CompetitionEncounterChangeDate', { description: 'Date changes for a competition encounter' })
@Entity('CompetitionEncounterChangeDates')
export class CompetitionEncounterChangeDate extends BaseEntity {
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
  declare encounterChangeId: string;

  @SortableField({ nullable: true })
  @Column({ nullable: true })
  declare originalDate?: Date;

  @SortableField({ nullable: true })
  @Column({ nullable: true })
  declare newDate?: Date;

  @SortableField({ nullable: true })
  @Column({ nullable: true })
  declare originalTime?: string;

  @SortableField({ nullable: true })
  @Column({ nullable: true })
  declare newTime?: string;

  @SortableField({ nullable: true })
  @Column({ nullable: true })
  declare originalLocationId?: string;

  @SortableField({ nullable: true })
  @Column({ nullable: true })
  declare newLocationId?: string;

  @Field(() => CompetitionEncounterChange)
  @ManyToOne(() => CompetitionEncounterChange, (competitionEncounterChange) => competitionEncounterChange.changeDates)
  declare competitionEncounterChange: Relation<CompetitionEncounterChange>;
}