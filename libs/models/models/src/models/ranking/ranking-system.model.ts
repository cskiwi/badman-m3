import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import {
  AfterLoad,
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  Relation,
  UpdateDateColumn,
} from 'typeorm';
import { Period, RankingSystems, StartingType } from '@app/models-enum';
import { RankingSystemRankingGroupMembership } from './ranking-group-ranking-system-membership.model';
import { RankingPoint } from './ranking-point.model';
import { RankingPlace } from './ranking-place.model';
import { RankingLastPlace } from './ranking-last-place.model';
import { SortableField, WhereField } from '@app/utils';

@ObjectType('RankingSystem', { description: 'A RankingSystem' })
@Entity('RankingSystems', { schema: 'ranking' })
export class RankingSystem extends BaseEntity {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  declare id: string;

  @SortableField()
  @WhereField()
  @CreateDateColumn()
  declare createdAt: Date;

  @SortableField()
  @WhereField()
  @UpdateDateColumn()
  declare updatedAt: Date;

  @SortableField()
  @WhereField()
  @Column()
  declare name: string;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column()
  declare amountOfLevels?: number;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column()
  declare procentWinning?: number;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column()
  declare procentWinningPlus1?: number;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column()
  declare procentLosing?: number;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column()
  declare minNumberOfGamesUsedForUpgrade?: number;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column()
  declare minNumberOfGamesUsedForDowngrade?: number;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column()
  declare maxDiffLevels?: number;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column()
  declare maxDiffLevelsHighest?: number;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column()
  declare latestXGamesToUse?: number;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column()
  declare maxLevelUpPerChange?: number;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column()
  declare maxLevelDownPerChange?: number;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column()
  declare gamesForInactivty?: number;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column()
  declare inactivityAmount?: number;

  @SortableField(() => String, { nullable: true })
  @WhereField(() => String, { nullable: true })
  @Column({
    type: 'simple-enum',
    enum: Period,
  })
  declare inactivityUnit: Period;

  @SortableField(() => String, { nullable: true })
  @WhereField(() => String, { nullable: true })
  @Column({ type: 'simple-enum', enum: ['freeze', 'decrease'] })
  declare inactiveBehavior: 'freeze' | 'decrease';

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column()
  declare calculationLastUpdate?: Date;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column()
  declare calculationDayOfWeek?: number;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column()
  declare calculationIntervalAmount?: number;

  @SortableField(() => String, { nullable: true })
  @WhereField(() => String, { nullable: true })
  @Column({
    type: 'simple-enum',
    enum: Period,
  })
  declare calculationIntervalUnit?: Period;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column()
  declare periodAmount?: number;

  @SortableField(() => String, { nullable: true })
  @WhereField(() => String, { nullable: true })
  @Column({
    type: 'simple-enum',
    enum: Period,
  })
  declare periodUnit?: Period;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column()
  declare updateLastUpdate?: Date;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column()
  declare updateDayOfWeek?: number;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column()
  declare updateIntervalAmount?: number;

  @SortableField(() => String, { nullable: true })
  @WhereField(() => String, { nullable: true })
  @Column({
    type: 'simple-enum',
    enum: Period,
  })
  declare updateIntervalUnit?: Period;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column()
  declare rankingSystem: string;

  @SortableField()
  @WhereField()
  @Column({ default: false })
  declare primary: boolean;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ default: false })
  declare calculateUpdates: boolean;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ default: false })
  declare runCurrently: boolean;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ nullable: true })
  declare differenceForUpgradeSingle?: number;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ nullable: true })
  declare differenceForUpgradeDouble?: number;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ nullable: true })
  declare differenceForUpgradeMix?: number;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ nullable: true })
  declare differenceForDowngradeSingle?: number;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ nullable: true })
  declare differenceForDowngradeDouble?: number;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ nullable: true })
  declare differenceForDowngradeMix?: number;

  @SortableField(() => [Int], { nullable: true })
  declare pointsToGoUp?: number[];

  @SortableField(() => [Int], { nullable: true })
  declare pointsWhenWinningAgainst?: number[];

  @SortableField(() => [Int], { nullable: true })
  declare pointsToGoDown?: number[];

  @SortableField(() => [Int], { nullable: true })
  declare levelArray?: number[];

  @SortableField(() => [Int], { nullable: true })
  declare levelArrayOneMinus?: number[];

  @SortableField(() => String)
  @WhereField(() => String)
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
  declare rankingSystemRankingGroupMemberships: Relation<RankingSystemRankingGroupMembership[]>;

  @OneToMany(() => RankingPoint, (rankingPoint) => rankingPoint.system)
  declare rankingPoints: Relation<RankingPoint[]>;

  @OneToMany(() => RankingPlace, (rankingPlace) => rankingPlace.system)
  declare rankingPlaces: Relation<RankingPlace[]>;

  @OneToMany(() => RankingLastPlace, (rankingLastPlace) => rankingLastPlace.system)
  declare rankingLastPlaces: Relation<RankingLastPlace[]>;

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
