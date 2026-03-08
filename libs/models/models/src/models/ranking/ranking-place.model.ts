import { Field, ID, ObjectType } from '@nestjs/graphql';
import {
  AfterInsert,
  AfterRemove,
  AfterUpdate,
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  MoreThan,
  PrimaryGeneratedColumn,
  Relation,
  UpdateDateColumn,
} from 'typeorm';
import { SortableField, WhereField } from '@app/utils';
import { Game } from '../event/game.model';
import { GamePlayerMembership } from '../event/game-player-membership';
import { Player } from '../player.model';
import { RankingGroup } from './ranking-group.model';
import { RankingLastPlace } from './ranking-last-place.model';
import { RankingSystem } from './ranking-system.model';

@Index(["playerId", "systemId", "rankingDate"], { unique: true })
@ObjectType('RankingPlace', { description: 'A RankingPlace' })
@Entity('RankingPlaces', { schema: 'ranking' })
export class RankingPlace extends BaseEntity {
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

  @SortableField()
  @WhereField()
  @Column({ type: 'timestamptz' })
  declare rankingDate: Date;

  @SortableField({ nullable: true })
  @WhereField({ nullable: true })
  @Column({ type: 'character varying', length: 255, nullable: true })
  declare gender: string;

  @SortableField()
  @WhereField()
  @Column({ default: false })
  declare updatePossible: boolean;

  @SortableField()
  @WhereField({ nullable: true })
  @Column({ nullable: true })
  declare singlePoints?: number;

  @SortableField()
  @WhereField({ nullable: true })
  @Column({ nullable: true })
  declare mixPoints?: number;

  @SortableField()
  @WhereField({ nullable: true })
  @Column({ nullable: true })
  declare doublePoints?: number;

  @SortableField()
  @WhereField({ nullable: true })
  @Column({ nullable: true })
  declare singlePointsDowngrade?: number;

  @SortableField()
  @WhereField({ nullable: true })
  @Column({ nullable: true })
  declare mixPointsDowngrade?: number;

  @SortableField()
  @WhereField({ nullable: true })
  @Column({ nullable: true })
  declare doublePointsDowngrade?: number;

  @SortableField()
  @WhereField({ nullable: true })
  @Column({ nullable: true })
  declare singleRank?: number;

  @SortableField()
  @WhereField({ nullable: true })
  @Column({ nullable: true })
  declare mixRank?: number;

  @SortableField()
  @WhereField({ nullable: true })
  @Column({ nullable: true })
  declare doubleRank?: number;

  @SortableField()
  @WhereField({ nullable: true })
  @Column({ nullable: true })
  declare totalSingleRanking?: number;

  @SortableField()
  @WhereField({ nullable: true })
  @Column({ nullable: true })
  declare totalMixRanking?: number;

  @SortableField()
  @WhereField({ nullable: true })
  @Column({ nullable: true })
  declare totalDoubleRanking?: number;

  @SortableField()
  @WhereField({ nullable: true })
  @Column({ nullable: true })
  declare totalWithinSingleLevel?: number;

  @SortableField()
  @WhereField({ nullable: true })
  @Column({ nullable: true })
  declare totalWithinMixLevel?: number;

  @SortableField()
  @WhereField({ nullable: true })
  @Column({ nullable: true })
  declare totalWithinDoubleLevel?: number;

  @SortableField()
  @WhereField({ nullable: true })
  @Column({ nullable: true })
  declare single?: number;

  @SortableField()
  @WhereField({ nullable: true })
  @Column({ nullable: true })
  declare mix?: number;

  @SortableField()
  @WhereField({ nullable: true })
  @Column({ nullable: true })
  declare double?: number;

  @SortableField()
  @WhereField()
  @Column({ default: false })
  declare singleInactive: boolean;

  @SortableField()
  @WhereField()
  @Column({ default: false })
  declare mixInactive: boolean;

  @SortableField()
  @WhereField()
  @Column({ default: false })
  declare doubleInactive: boolean;

  @WhereField(() => ID)
  @Column()
  declare playerId: string;

  @WhereField(() => ID)
  @Column()
  declare systemId: string;

  @WhereField(() => ID, { nullable: true })
  @Column({ nullable: true, type: 'uuid' })
  declare groupId?: string;

  @Field(() => Player, { nullable: true })
  @ManyToOne(() => Player, (player) => player.rankingPlaces)
  @JoinColumn({ name: 'playerId' })
  declare player: Relation<Player>;

  @Field(() => RankingSystem, { nullable: true })
  @ManyToOne(() => RankingSystem, (system) => system.rankingPlaces)
  @JoinColumn({ name: 'systemId' })
  declare system: Relation<RankingSystem>;

  @Field(() => RankingGroup, { nullable: true })
  @ManyToOne(() => RankingGroup)
  @JoinColumn({ name: 'groupId' })
  declare group?: Relation<RankingGroup>;


  @AfterInsert()
  async afterInsertHook(): Promise<void> {
    if (!this.playerId || !this.systemId || !this.rankingDate) return;
    await RankingPlace.updateLatestRankings([this], 'create');
  }

  @AfterUpdate()
  async afterUpdateHook(): Promise<void> {
    if (!this.playerId || !this.systemId || !this.rankingDate) return;
    await Promise.all([
      RankingPlace.updateLatestRankings([this], 'update'),
      RankingPlace.updateGameRanking([this]),
    ]);
  }

  @AfterRemove()
  async afterRemoveHook(): Promise<void> {
    if (!this.playerId || !this.systemId) return;
    const lastRanking = await RankingPlace.findOne({
      where: { playerId: this.playerId, systemId: this.systemId },
      order: { rankingDate: 'DESC' },
    });
    if (lastRanking) {
      await RankingPlace.updateLatestRankings([lastRanking], 'destroy');
    }
  }

  private static async updateLatestRankings(
    instances: RankingPlace[],
    type: 'create' | 'update' | 'destroy',
  ): Promise<void> {
    let instancesToProcess = instances;

    if (type !== 'create') {
      const existing = await RankingLastPlace.find({
        where: instances.map((i) => ({ playerId: i.playerId, systemId: i.systemId })),
      });
      instancesToProcess = instances.filter((i) =>
        existing.some((e) => e.playerId === i.playerId && e.systemId === i.systemId),
      );
    }

    for (const instance of instancesToProcess) {
      const lastPlace = await RankingLastPlace.findOne({
        where: { playerId: instance.playerId, systemId: instance.systemId },
      });

      const data = RankingPlace.asLastRankingPlace(instance);

      if (!lastPlace) {
        await RankingLastPlace.save(RankingLastPlace.create(data));
      } else if (
        !lastPlace.rankingDate ||
        !instance.rankingDate ||
        new Date(instance.rankingDate) >= new Date(lastPlace.rankingDate)
      ) {
        const updateData = Object.fromEntries(
          Object.entries(data).filter(([, value]) => value !== undefined && value !== null),
        );
        await RankingLastPlace.update({ id: lastPlace.id }, updateData);
      }
    }
  }

  private static async updateGameRanking(instances: RankingPlace[]): Promise<void> {
    try {
      for (const instance of instances) {
        const nextRankingPlace = await RankingPlace.findOne({
          where: {
            playerId: instance.playerId,
            systemId: instance.systemId,
            rankingDate: MoreThan(instance.rankingDate),
          },
          order: { rankingDate: 'ASC' },
        });

        const endDate = nextRankingPlace?.rankingDate;

        const qb = GamePlayerMembership.createQueryBuilder('gpm')
          .innerJoin(Game, 'game', 'game.id = gpm.gameId')
          .where('gpm.playerId = :playerId', { playerId: instance.playerId })
          .andWhere('game.playedAt >= :startDate', { startDate: instance.rankingDate });

        if (endDate) {
          qb.andWhere('game.playedAt < :endDate', { endDate });
        }

        const memberships = await qb.getMany();

        for (const membership of memberships) {
          await GamePlayerMembership.update(membership.id, {
            systemId: instance.systemId,
            single: instance.single,
            double: instance.double,
            mix: instance.mix,
          });
        }
      }
    } catch (e) {
      console.error('Failed to update game rankings', e);
    }
  }

  private static asLastRankingPlace(instance: RankingPlace): Partial<RankingLastPlace> {
    return {
      rankingDate: instance.rankingDate,
      gender: instance.gender,
      singlePoints: instance.singlePoints,
      mixPoints: instance.mixPoints,
      doublePoints: instance.doublePoints,
      singlePointsDowngrade: instance.singlePointsDowngrade,
      mixPointsDowngrade: instance.mixPointsDowngrade,
      doublePointsDowngrade: instance.doublePointsDowngrade,
      singleRank: instance.singleRank,
      mixRank: instance.mixRank,
      doubleRank: instance.doubleRank,
      totalSingleRanking: instance.totalSingleRanking,
      totalMixRanking: instance.totalMixRanking,
      totalDoubleRanking: instance.totalDoubleRanking,
      totalWithinSingleLevel: instance.totalWithinSingleLevel,
      totalWithinMixLevel: instance.totalWithinMixLevel,
      totalWithinDoubleLevel: instance.totalWithinDoubleLevel,
      single: instance.single,
      mix: instance.mix,
      double: instance.double,
      singleInactive: instance.singleInactive,
      mixInactive: instance.mixInactive,
      doubleInactive: instance.doubleInactive,
      playerId: instance.playerId,
      systemId: instance.systemId,
    };
  }
}
