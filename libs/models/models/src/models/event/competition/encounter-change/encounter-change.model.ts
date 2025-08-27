import { Field, ID, ObjectType } from '@nestjs/graphql';
import { BaseEntity, Column, CreateDateColumn, Entity, Index, OneToMany, PrimaryGeneratedColumn, Relation, UpdateDateColumn } from 'typeorm';
import { SortableField, WhereField } from '@app/utils';
import { CompetitionEncounterChangeDate as CompetitionEncounterChangeDate } from './encounter-change-date.model';

@ObjectType('CompetitionEncounterChange', { description: 'Changes made to a competition encounter' })
@Entity('EncounterChanges', { schema: 'event' })
export class CompetitionEncounterChange extends BaseEntity {
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

  @SortableField()
  @WhereField()
  @Column({ default: false })
  declare accepted: boolean;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ type: 'uuid', nullable: true })
  declare encounterId?: string;

  @Field(() => [CompetitionEncounterChangeDate], { nullable: true })
  @OneToMany(() => CompetitionEncounterChangeDate, (changeDate) => changeDate.encounterChange)
  declare changeDates?: Relation<CompetitionEncounterChangeDate[]>;
}
