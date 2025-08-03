import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Relation,
  UpdateDateColumn,
} from 'typeorm';
import { SortableField, WhereField } from '@app/utils';
import { DrawType } from '@app/models-enum';
import { CompetitionEncounter } from './competition-encounter.model';
import { CompetitionSubEvent } from './competition-sub-event.model';

@ObjectType('CompetitionDraw', { description: 'A Competition Draw' })
@Entity('DrawCompetitions', { schema: 'event' })
export class CompetitionDraw extends BaseEntity {
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
  declare name?: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  declare visualCode?: string;

  @SortableField(() => String, { nullable: true })
  @Column({ type: 'simple-enum', enum: DrawType, nullable: true })
  declare type?: DrawType;

  @SortableField(() => Int, { nullable: true })
  @Column({ nullable: true })
  declare size?: number;

  @SortableField(() => Int, { nullable: true })
  @Column({ nullable: true })
  declare risers?: number;

  @SortableField(() => Int, { nullable: true })
  @Column({ nullable: true })
  declare fallers?: number;

  @SortableField({ nullable: true })
  @Column({ nullable: true })
  declare subeventId?: string;

  @Field(() => CompetitionSubEvent, { nullable: true })
  @ManyToOne(() => CompetitionSubEvent, { nullable: true, onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'subeventId' })
  declare competitionSubEvent?: Relation<CompetitionSubEvent>;

  @OneToMany(() => CompetitionEncounter, (encounter) => encounter.drawCompetition)
  declare competitionEncounters?: Relation<CompetitionEncounter[]>;

  @SortableField(() => Date, { nullable: true })
  @WhereField(() => Date, { nullable: true })
  @Column({ nullable: true })
  declare lastSync?: Date;
}
