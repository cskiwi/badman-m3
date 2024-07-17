import { Field, Int, ObjectType } from '@nestjs/graphql';
import {
  AfterLoad,
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Period, RankingSystems, StartingType } from '@app/models/enums';
import { RankingSystemRankingGroupMembership } from './ranking-group-ranking-system-membership.model';

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

  @Field({ nullable: true })
  @Column()
  declare amountOfLevels?: number;

  @Field({ nullable: true })
  @Column()
  declare procentWinning?: number;

  @Field({ nullable: true })
  @Column()
  declare procentWinningPlus1?: number;

  @Field({ nullable: true })
  @Column()
  declare procentLosing?: number;

  @Field({ nullable: true })
  @Column()
  declare minNumberOfGamesUsedForUpgrade?: number;

  @Field({ nullable: true })
  @Column()
  declare minNumberOfGamesUsedForDowngrade?: number;

  @Field({ nullable: true })
  @Column()
  declare maxDiffLevels?: number;

  @Field({ nullable: true })
  @Column()
  declare maxDiffLevelsHighest?: number;

  @Field({ nullable: true })
  @Column()
  declare latestXGamesToUse?: number;

  @Field({ nullable: true })
  @Column()
  declare maxLevelUpPerChange?: number;

  @Field({ nullable: true })
  @Column()
  declare maxLevelDownPerChange?: number;

  @Field({ nullable: true })
  @Column()
  declare gamesForInactivty?: number;

  @Field({ nullable: true })
  @Column()
  declare inactivityAmount?: number;

  @Field(() => String, { nullable: true })
  @Column({
    type: 'simple-enum',
    enum: Period,
  })
  declare inactivityUnit: Period;

  @Field(() => String, { nullable: true })
  @Column({ type: 'simple-enum', enum: ['freeze', 'decrease'] })
  declare inactiveBehavior: 'freeze' | 'decrease';

  @Field({ nullable: true })
  @Column()
  declare calculationLastUpdate?: Date;

  @Field({ nullable: true })
  @Column()
  declare calculationDayOfWeek?: number;

  @Field({ nullable: true })
  @Column()
  declare calculationIntervalAmount?: number;

  @Field(() => String, { nullable: true })
  @Column({
    type: 'simple-enum',
    enum: Period,
  })
  declare calculationIntervalUnit?: Period;

  @Field({ nullable: true })
  @Column()
  declare periodAmount?: number;

  @Field(() => String, { nullable: true })
  @Column({
    type: 'simple-enum',
    enum: Period,
  })
  declare periodUnit?: Period;

  @Field({ nullable: true })
  @Column()
  declare updateLastUpdate?: Date;

  @Field({ nullable: true })
  @Column()
  declare updateDayOfWeek?: number;

  @Field({ nullable: true })
  @Column()
  declare updateIntervalAmount?: number;

  @Field(() => String, { nullable: true })
  @Column({
    type: 'simple-enum',
    enum: Period,
  })
  declare updateIntervalUnit?: Period;

  @Field({ nullable: true })
  @Column()
  declare rankingSystem: string;

  @Field()
  @Column({ default: false })
  declare primary: boolean;

  @Field({ nullable: true })
  @Column({ default: false })
  declare calculateUpdates: boolean;

  @Field({ nullable: true })
  @Column({ default: false })
  declare runCurrently: boolean;

  @Field({ nullable: true })
  @Column({ nullable: true })
  declare differenceForUpgradeSingle?: number;

  @Field({ nullable: true })
  @Column({ nullable: true })
  declare differenceForUpgradeDouble?: number;

  @Field({ nullable: true })
  @Column({ nullable: true })
  declare differenceForUpgradeMix?: number;

  @Field({ nullable: true })
  @Column({ nullable: true })
  declare differenceForDowngradeSingle?: number;

  @Field({ nullable: true })
  @Column({ nullable: true })
  declare differenceForDowngradeDouble?: number;

  @Field({ nullable: true })
  @Column({ nullable: true })
  declare differenceForDowngradeMix?: number;

  @Field(() => [Int], { nullable: true })
  declare pointsToGoUp?: number[];

  @Field(() => [Int], { nullable: true })
  declare pointsWhenWinningAgainst?: number[];

  @Field(() => [Int], { nullable: true })
  declare pointsToGoDown?: number[];

  @Field(() => [Int], { nullable: true })
  declare levelArray?: number[];

  @Field(() => [Int], { nullable: true })
  declare levelArrayOneMinus?: number[];

  @Field(() => String)
  @Column({
    type: 'simple-enum',
    enum: StartingType,
    default: StartingType.formula,
  })
  declare startingType: StartingType;

  @OneToMany(
    () => RankingSystemRankingGroupMembership,
    (membership) => membership.rankingSystem,
  )
  declare rankingSystemRankingGroupMemberships: RankingSystemRankingGroupMembership;

  @AfterLoad()
  setupValues() {
    if (!this.amountOfLevels) {
      throw new Error('Amount of levels is not set');
    }

    this.levelArray = Array(this.amountOfLevels)
      .fill(0)
      .map((v, i) => i);

    switch (this.rankingSystem) {
      case RankingSystems.BVL:
      case RankingSystems.VISUAL:
        this._bvlCaps();
        break;
      case RankingSystems.LFBB:
        this._lfbbCaps();
        break;
      case RankingSystems.ORIGINAL:
        this._originalCaps();
        break;
    }
  }

  private _bvlCaps() {
    this.pointsToGoUp = [];
    this.pointsWhenWinningAgainst = [];
    this.pointsToGoDown = [];

    for (let x = 0; x < (this.levelArray?.length ?? 0); x++) {
      if (x === 0) {
        this.pointsWhenWinningAgainst[x] = 50;
      } else {
        this.pointsWhenWinningAgainst[x] =
          (this.pointsWhenWinningAgainst[x - 1] * (this.procentWinning ?? 1)) /
          (this.procentWinningPlus1 ?? 1);
      }
    }
    for (let x = 0; x < (this.levelArray?.length ?? 0) - 1; x++) {
      this.pointsToGoUp[x] = Math.round(
        (this.pointsWhenWinningAgainst[x] * (this.procentWinning ?? 1)) / 100,
      );
    }

    for (let x = 0; x < (this.levelArray?.length ?? 0) - 1; x++) {
      this.pointsToGoDown[x] = Math.round(
        (this.pointsWhenWinningAgainst[x + 1] * (this.procentLosing ?? 1)) /
          100,
      );
    }

    this.pointsWhenWinningAgainst = this.pointsWhenWinningAgainst.map((p) =>
      Math.round(p),
    );
  }

  private _lfbbCaps() {
    this.pointsWhenWinningAgainst = [
      10, 30, 45, 60, 75, 120, 165, 210, 255, 390, 525, 660, 795, 1200, 1605,
      2010, 2415,
    ];
    this.pointsToGoUp = [
      5, 20, 31, 38, 61, 83, 106, 128, 196, 263, 331, 398, 601, 803, 1006, 1208,
    ];
    this.pointsToGoDown = this.pointsToGoUp;
  }
  private _originalCaps() {
    throw new Error('Not implementd');
  }
}
