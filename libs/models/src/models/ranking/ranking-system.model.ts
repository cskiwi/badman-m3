import { Field, Int, ObjectType } from '@nestjs/graphql';
import {
  BaseEntity,
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { RankingGroup } from './ranking-group.model';
import { RankingSystemRankingGroupMembership } from './ranking-group-ranking-system-membership.model';

@ObjectType('RankingSystem')
@Entity('RankingSystems', { schema: 'ranking' })
export class RankingSystem extends BaseEntity {
  @Field()
  @PrimaryGeneratedColumn('uuid')
  declare id: string;

  @Field()
  @Column()
  declare name: string;

  @Field()
  @Column()
  declare amountOfLevels: number;

  @Field()
  @Column()
  declare procentWinning: number;

  @Field()
  @Column()
  declare procentWinningPlus1: number;

  @Field()
  @Column()
  declare procentLosing: number;

  @Field(() => Int, { nullable: true })
  @Column()
  declare minNumberOfGamesUsedForUpgrade: number;

  @Field(() => Int, { nullable: true })
  @Column()
  declare minNumberOfGamesUsedForDowngrade: number;

  @Field(() => Int, { nullable: true })
  @Column()
  declare maxDiffLevels: number;

  @Field(() => Int, { nullable: true })
  @Column()
  declare maxDiffLevelsHighest: number;

  @Field(() => Int, { nullable: true })
  @Column()
  declare latestXGamesToUse: number;

  @Field(() => Int, { nullable: true })
  @Column()
  declare maxLevelUpPerChange: number;

  @Field(() => Int, { nullable: true })
  @Column()
  declare maxLevelDownPerChange: number;

  @Field(() => Int, { nullable: true })
  @Column()
  declare gamesForInactivty: number;

  @Field(() => Int, { nullable: true })
  @Column()
  declare inactivityAmount: number;

  @Field()
  @Column()
  declare inactivityUnit: 'months' | 'weeks' | 'days';

  @Field({ nullable: true })
  @Column({ nullable: true })
  declare inactiveBehavior: 'freeze' | 'decrease';

  @Field()
  @Column()
  declare calculationLastUpdate: Date;

  @Field()
  @Column()
  declare calculationDayOfWeek: number;

  @Field()
  @Column()
  declare calculationIntervalAmount: number;

  @Field()
  @Column()
  declare calculationIntervalUnit: 'months' | 'weeks' | 'days';

  @Field()
  @Column()
  declare periodAmount: 'months' | 'weeks' | 'days';

  @Field()
  @Column()
  declare periodUnit: string;

  @Field()
  @Column()
  declare updateLastUpdate: Date;

  @Field()
  @Column()
  declare updateDayOfWeek: number;

  @Field()
  @Column()
  declare updateIntervalAmount: number;

  @Field()
  @Column()
  declare updateIntervalUnit: string;

  @Field()
  @Column()
  declare rankingSystem: string;

  @Field()
  @Column()
  declare primary: boolean;

  @Field()
  @Column()
  declare calculateUpdates: boolean;

  @Field()
  @Column()
  declare runCurrently: boolean;

  @Field()
  @Column()
  declare differenceForUpgradeSingle: number;

  @Field()
  @Column()
  declare differenceForUpgradeDouble: number;

  @Field()
  @Column()
  declare differenceForUpgradeMix: number;

  @Field()
  @Column()
  declare differenceForDowngradeSingle: number;

  @Field()
  @Column()
  declare differenceForDowngradeDouble: number;

  @Field()
  @Column()
  declare differenceForDowngradeMix: number;

  @Field()
  @Column()
  declare startingType: string;

  @ManyToOne(
    () => RankingSystemRankingGroupMembership,
    (rankingGroup) => rankingGroup.rankingSystem,
  )
  declare rankingSystemRankingGroupMembership: RankingSystemRankingGroupMembership;
}
