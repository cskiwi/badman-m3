import { Field, Int, ObjectType } from '@nestjs/graphql';
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { RankingSystemRankingGroupMembership } from './ranking-group-ranking-system-membership.model';
import { Period, StartingType } from '../../enums';

@ObjectType('RankingSystem')
@Entity('RankingSystems', { schema: 'ranking' })
export class RankingSystem extends BaseEntity {
  @Field()
  @PrimaryGeneratedColumn('uuid')
  declare id: string;

  @Field()
  @CreateDateColumn()
  declare createdAt: Date;

  @Field()
  @UpdateDateColumn()
  declare updatedAt: Date;

  @Field()
  @Column()
  declare name: string;

  @Field()
  @Column()
  declare amountOfLevels?: number;

  @Field()
  @Column()
  declare procentWinning?: number;

  @Field()
  @Column()
  declare procentWinningPlus1?: number;

  @Field()
  @Column()
  declare procentLosing?: number;

  @Field(() => Int)
  @Column()
  declare minNumberOfGamesUsedForUpgrade?: number;

  @Field(() => Int)
  @Column()
  declare minNumberOfGamesUsedForDowngrade?: number;

  @Field(() => Int)
  @Column()
  declare maxDiffLevels?: number;

  @Field(() => Int)
  @Column()
  declare maxDiffLevelsHighest?: number;

  @Field(() => Int)
  @Column()
  declare latestXGamesToUse?: number;

  @Field(() => Int)
  @Column()
  declare maxLevelUpPerChange?: number;

  @Field(() => Int)
  @Column()
  declare maxLevelDownPerChange?: number;

  @Field(() => Int)
  @Column()
  declare gamesForInactivty?: number;

  @Field(() => Int)
  @Column()
  declare inactivityAmount?: number;

  @Field()
  @Column({
    type: 'simple-enum',
    enum: Period,
  })
  declare inactivityUnit: Period;

  @Field()
  @Column({ type: 'simple-enum', enum: ['freeze', 'decrease'] })
  declare inactiveBehavior?: 'freeze' | 'decrease';

  @Field()
  @Column()
  declare calculationLastUpdate?: Date;

  @Field()
  @Column()
  declare calculationDayOfWeek?: number;

  @Field()
  @Column()
  declare calculationIntervalAmount?: number;

  @Field()
  @Column({
    type: 'simple-enum',
    enum: Period,
  })
  declare calculationIntervalUnit?: Period;

  @Field()
  @Column()
  declare periodAmount?: number;

  @Field()
  @Column({
    type: 'simple-enum',
    enum: Period,
  })
  declare periodUnit?: Period;

  @Field()
  @Column()
  declare updateLastUpdate?: Date;

  @Field()
  @Column()
  declare updateDayOfWeek?: number;

  @Field()
  @Column()
  declare updateIntervalAmount?: number;

  @Field()
  @Column({
    type: 'simple-enum',
    enum: Period,
  })
  declare updateIntervalUnit?: Period;

  @Field()
  @Column()
  declare rankingSystem: string;

  @Field()
  @Column({ default: false})
  declare primary: boolean;

  @Field()
  @Column({ default: false})
  declare calculateUpdates: boolean;

  @Field()
  @Column({ default: false})
  declare runCurrently: boolean;

  @Field()
  @Column({ nullable: true})
  declare differenceForUpgradeSingle?: number;

  @Field()
    @Column({ nullable: true})

  declare differenceForUpgradeDouble?: number;

  @Field()
    @Column({ nullable: true})

  declare differenceForUpgradeMix?: number;

  @Field()
    @Column({ nullable: true})

  declare differenceForDowngradeSingle?: number;

  @Field()
    @Column({ nullable: true})

  declare differenceForDowngradeDouble?: number;

  @Field()
    @Column({ nullable: true})

  declare differenceForDowngradeMix?: number;

  @Field()
  @Column({
    type: 'simple-enum',
    enum: StartingType,
    default: StartingType.formula,
  })
  declare startingType: StartingType;

  @ManyToOne(
    () => RankingSystemRankingGroupMembership,
    (rankingGroup) => rankingGroup.rankingSystem,
  )
  declare rankingSystemRankingGroupMembership: RankingSystemRankingGroupMembership;
}
