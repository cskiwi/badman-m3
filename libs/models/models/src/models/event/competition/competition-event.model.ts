import { LevelType, Period } from '@app/models/enums';
import { SortableField } from '@app/utils';
import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import {
  Entity,
  BaseEntity,
  CreateDateColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Column,
} from 'typeorm';

@Entity('EventCompetitions', { schema: 'event' })
@ObjectType({ description: 'A EventCompetition' })
export class EventCompetition extends BaseEntity {
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
  @Column()
  declare name: string;

  @SortableField(() => Int, { nullable: true })
  @Column()
  declare season: number;

  @SortableField(() => Date, { nullable: true })
  @Column()
  declare lastSync: Date;

  @SortableField(() => Date, { nullable: true })
  @Column()
  declare openDate: Date;

  @SortableField(() => Date, { nullable: true })
  @Column()
  declare closeDate: Date;

  @SortableField(() => Date, { nullable: true })
  @Column()
  declare changeOpenDate: Date;

  @SortableField(() => Date, { nullable: true })
  @Column()
  declare changeCloseDate: Date;

  @SortableField(() => Date, { nullable: true })
  @Column()
  declare changeCloseRequestDate: Date;

  // @SortableField(() => EventCompetitionMetaType, { nullable: true })
  // @Column({
  //   type: DataType.JSON,
  // })
  // meta?: MetaEventCompetition;


  @SortableField({ nullable: true })
  @Column()
  declare visualCode: string;

  @SortableField({ nullable: true })
  @Column()
  declare slug: string;

  @SortableField({ nullable: true })
  @Column()
  teamMatcher?: string;


  @SortableField(() => Boolean)
  @Column({
    default: false,
  })
  declare official: boolean;

  @SortableField(() => String, { nullable: true })
  @Column({
    type: 'simple-enum',
    enum: LevelType,
  })
  declare type: LevelType;

  @SortableField(() => Boolean)
  @Column({
    default: false,
  })
  declare checkEncounterForFilledIn: boolean;


  @SortableField({ nullable: true })
  @Column()
  declare state: string;

  @SortableField({ nullable: true })
  @Column()
  declare country: string;
}
