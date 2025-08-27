import { ChangeEncounterAvailability } from '@app/models-enum';
import { SortableField, WhereField } from '@app/utils';
import { Field, ID, ObjectType } from '@nestjs/graphql';
import { BaseEntity, Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, Relation, UpdateDateColumn } from 'typeorm';
import { CompetitionEncounterChange } from './encounter-change.model';

@ObjectType('CompetitionEncounterChangeDate', { description: 'Date changes for a competition encounter' })
@Entity('EncounterChangeDates', { schema: 'event' })
export class CompetitionEncounterChangeDate extends BaseEntity {
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
  declare updatedAt?: Date;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ type: 'uuid', nullable: true })
  @Index()
  declare encounterChangeId?: string;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ nullable: true })
  declare selected?: boolean;

  @SortableField()
  @WhereField()
  @Column({ type: 'timestamptz' })
  declare date: Date;

  @SortableField(() => String, { nullable: true })
  @WhereField(() => String, { nullable: true })
  @Column({ type: 'simple-enum', enum: ChangeEncounterAvailability, nullable: true })
  declare availabilityHome?: ChangeEncounterAvailability;

  @SortableField(() => String, { nullable: true })
  @WhereField(() => String, { nullable: true })
  @Column({ type: 'simple-enum', enum: ChangeEncounterAvailability, nullable: true })
  declare availabilityAway?: ChangeEncounterAvailability;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ nullable: true, type: 'uuid' })
  declare locationId?: string;

  @Field(() => CompetitionEncounterChange)
  @ManyToOne(() => CompetitionEncounterChange, (competitionEncounterChange) => competitionEncounterChange.changeDates)
  declare encounterChange: Relation<CompetitionEncounterChange>;
}
