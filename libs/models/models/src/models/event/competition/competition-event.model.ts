import { LevelType, Period } from '@app/models/enums';
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
@ObjectType({ description: 'A EventTournament' })
export class EventCompetition extends BaseEntity {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  declare id: string;

  @Field()
  @CreateDateColumn()
  declare createdAt: Date;

  @Field({ nullable: true })
  @UpdateDateColumn({ nullable: true })
  declare updatedAt: Date;

  @Field({ nullable: true })
  @Column()
  declare name: string;

  @Field(() => Int, { nullable: true })
  @Column()
  declare season: number;

  @Field(() => Date, { nullable: true })
  @Column()
  declare lastSync: Date;

  @Field(() => Date, { nullable: true })
  @Column()
  declare openDate: Date;

  @Field(() => Date, { nullable: true })
  @Column()
  declare closeDate: Date;

  @Field(() => Date, { nullable: true })
  @Column()
  declare changeOpenDate: Date;

  @Field(() => Date, { nullable: true })
  @Column()
  declare changeCloseDate: Date;

  @Field(() => Date, { nullable: true })
  @Column()
  declare changeCloseRequestDate: Date;

  // @Field(() => EventCompetitionMetaType, { nullable: true })
  // @Column({
  //   type: DataType.JSON,
  // })
  // meta?: MetaEventCompetition;

  @Field({ nullable: true })
  @Column()
  declare dates: string;

  @Field({ nullable: true })
  @Column()
  declare visualCode: string;

  @Field({ nullable: true })
  @Column()
  declare slug: string;

  @Field({ nullable: true })
  @Column()
  teamMatcher?: string;

  @Field({ nullable: true })
  @Column()
  declare inactivityAmount?: number;

  @Field(() => String, { nullable: true })
  @Column({
    type: 'simple-enum',
    enum: Period,
  })
  declare usedRankingUnit: Period;

  @Field(() => Boolean)
  @Column({
    default: false,
  })
  declare official: boolean;

  @Field(() => String, { nullable: true })
  @Column({
    type: 'simple-enum',
    enum: LevelType,
  })
  declare type: LevelType;

  @Field(() => Boolean)
  @Column({
    default: false,
  })
  declare checkEncounterForFilledIn: boolean;


  @Field({ nullable: true })
  @Column()
  declare state: string;

  @Field({ nullable: true })
  @Column()
  declare country: string;
}
