import { SubEventTypeEnum } from '@app/models-enum';
import { SortableField, WhereField } from '@app/utils';
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
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { CompetitionDraw } from './competition-draw.model';
import { CompetitionEvent } from './competition-event.model';

@ObjectType('CompetitionSubEvent', { description: 'A Sub Event Competition' })
@Entity('SubEventCompetitions', { schema: 'event' })
@Unique(['name', 'eventType', 'eventId'])
export class CompetitionSubEvent extends BaseEntity {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  declare id: string;

  @SortableField()
  @WhereField()
  @CreateDateColumn({ type: 'timestamptz' })
  declare createdAt: Date;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @UpdateDateColumn({ type: 'timestamptz' })
  declare updatedAt: Date;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ nullable: true, type: 'character varying', length: 255 })
  declare name?: string;

  @SortableField(() => String, { nullable: true })
  @WhereField(() => String, { nullable: true })
  @Column({ type: 'simple-enum', enum: SubEventTypeEnum, nullable: true })
  declare eventType?: SubEventTypeEnum;

  @SortableField(() => Int, { nullable: true })
  @WhereField(() => Int, { nullable: true })
  @Column({ nullable: true })
  declare level?: number;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ nullable: true, type: 'uuid' })
  declare eventId?: string;

  @SortableField(() => String, { nullable: true })
  @WhereField(() => String, { nullable: true })
  @Column({ type: 'character varying', length: 255, nullable: true })
  declare visualCode?: string;

  @SortableField(() => Int, { nullable: true })
  @WhereField(() => Int, { nullable: true })
  @Column({ nullable: true })
  declare maxLevel?: number;

  @SortableField(() => Int, { nullable: true })
  @WhereField(() => Int, { nullable: true })
  @Column({ nullable: true })
  declare minBaseIndex?: number;

  @SortableField(() => Int, { nullable: true })
  @Column({ nullable: true })
  declare maxBaseIndex?: number;

  @SortableField(() => Date, { nullable: true })
  @WhereField(() => Date, { nullable: true })
  @Column({ nullable: true, type: 'timestamptz' })
  declare lastSync?: Date;

  @Field(() => CompetitionEvent, { nullable: true })
  @ManyToOne(() => CompetitionEvent, { nullable: true, onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'eventId' })
  declare competitionEvent?: Relation<CompetitionEvent>;

  @Field(() => [CompetitionDraw], { nullable: true })
  @OneToMany(() => CompetitionDraw, (draw) => draw.competitionSubEvent)
  declare competitionDraws?: Relation<CompetitionDraw[]>;
}
