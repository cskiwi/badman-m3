import { AllowAnonymous, PermGuard, User } from '@app/backend-authorization';
import { ClubPlayerMembership, Club, Team, Player, TournamentEvent, CompetitionEncounter, Game, GamePlayerMembership, TeamPlayerMembership } from '@app/models';
import { IsUUID } from '@app/utils';
import { ForbiddenException, NotFoundException, UseGuards } from '@nestjs/common';
import { Args, Field, ID, Int, ObjectType, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { ClubArgs, ClubPlayerMembershipArgs, TeamArgs, TournamentEventArgs } from '../args';

@ObjectType('ClubSeasonRecord')
class ClubSeasonRecord {
  @Field(() => Int)
  declare wins: number;

  @Field(() => Int)
  declare losses: number;

  @Field(() => Int)
  declare draws: number;

  @Field(() => Int)
  declare total: number;

  @Field(() => Number, { description: 'Win percentage 0-1' })
  declare winRate: number;
}

@ObjectType('ClubTopPerformer')
class ClubTopPerformer {
  @Field(() => Player)
  declare player: Player;

  @Field(() => Int)
  declare wins: number;

  @Field(() => Int)
  declare total: number;

  @Field(() => Number, { description: 'Win percentage 0-1' })
  declare winRate: number;
}

@Resolver(() => Club)
export class ClubResolver {
  @Query(() => Club)
  @AllowAnonymous()
  async club(@Args('id', { type: () => ID }) id: string): Promise<Club> {
    const club = IsUUID(id)
      ? await Club.findOne({
          where: {
            id,
          },
        })
      : await Club.findOne({
          where: {
            slug: id,
          },
        });

    if (club) {
      return club;
    }

    throw new NotFoundException(id);
  }

  @Query(() => [Club])
  @AllowAnonymous()
  async clubs(
    @Args('args', { type: () => ClubArgs, nullable: true })
    inputArgs?: InstanceType<typeof ClubArgs>,
  ): Promise<Club[]> {
    const args = ClubArgs.toFindOneOptions(inputArgs);
    return Club.find(args);
  }

  @ResolveField(() => [ClubPlayerMembership])
  async clubPlayerMemberships(
    @Parent() { id }: Club,
    @Args('args', {
      type: () => ClubPlayerMembershipArgs,
      nullable: true,
    })
    inputArgs?: InstanceType<typeof ClubPlayerMembershipArgs>,
  ) {
    const args = ClubPlayerMembershipArgs.toFindManyOptions(inputArgs);

    if (args.where?.length > 0) {
      args.where = args.where.map((where) => ({
        ...where,
        clubId: id,
      }));
    } else {
      args.where = [
        {
          clubId: id,
        },
      ];
    }

    return ClubPlayerMembership.find(args);
  }

  @ResolveField(() => [Team], { nullable: true })
  async teams(
    @Parent() { id }: Player,
    @Args('args', { type: () => TeamArgs, nullable: true })
    inputArgs?: InstanceType<typeof TeamArgs>,
  ) {
    const args = TeamArgs.toFindManyOptions(inputArgs);

    if (args.where?.length > 0) {
      args.where = args.where.map((where) => ({
        ...where,
        clubId: id,
      }));
    } else {
      args.where = [
        {
          clubId: id,
        },
      ];
    }

    return Team.find(args);
  }

  @ResolveField(() => [Number], { nullable: true })
  async distinctSeasons(@Parent() { id }: Club): Promise<number[]> {
    const result = await Team.createQueryBuilder('team')
      .select('DISTINCT team.season', 'season')
      .where('team.clubId = :clubId', { clubId: id })
      .andWhere('team.season IS NOT NULL')
      .orderBy('team.season', 'DESC')
      .getRawMany();

    return result.map((row) => row.season);
  }

  @ResolveField(() => [TournamentEvent], { nullable: true })
  async tournamentEvents(
    @Parent() { id }: Club,
    @Args('args', { type: () => TournamentEventArgs, nullable: true })
    inputArgs?: InstanceType<typeof TournamentEventArgs>,
  ): Promise<TournamentEvent[]> {
    const args = TournamentEventArgs.toFindManyOptions(inputArgs);

    if (args.where?.length > 0) {
      args.where = args.where.map((where) => ({
        ...where,
        clubId: id,
      }));
    } else {
      args.where = [{ clubId: id }];
    }

    return TournamentEvent.find(args);
  }

  /**
   * Count of currently-active player memberships for the club.
   * If `season` is provided, count members active at that season's
   * reference date (Sept 1 of season year). Otherwise, today.
   */
  @ResolveField(() => Int)
  async memberCount(
    @Parent() { id }: Club,
    @Args('season', { type: () => Int, nullable: true }) season?: number,
  ): Promise<number> {
    const refDate = season ? new Date(`${season}-09-01`) : new Date();
    const refIso = refDate.toISOString();

    return ClubPlayerMembership.createQueryBuilder('m')
      .where('m.clubId = :clubId', { clubId: id })
      .andWhere('m.start <= :ref', { ref: refIso })
      .andWhere('(m.end IS NULL OR m.end > :ref)', { ref: refIso })
      .getCount();
  }

  /**
   * Aggregated win/loss/draw record across all of the club's teams
   * for a given season (or the most recent season if not specified).
   * Wins/losses are derived from `homeScore` vs `awayScore`.
   */
  @ResolveField(() => ClubSeasonRecord)
  async seasonRecord(
    @Parent() { id }: Club,
    @Args('season', { type: () => Int, nullable: true }) season?: number,
  ): Promise<ClubSeasonRecord> {
    const teamIdsQb = Team.createQueryBuilder('t').select('t.id', 'id').where('t.clubId = :clubId', { clubId: id });
    if (season != null) {
      teamIdsQb.andWhere('t.season = :season', { season });
    }
    const teamRows = await teamIdsQb.getRawMany<{ id: string }>();
    const teamIds = teamRows.map((r) => r.id);

    if (teamIds.length === 0) {
      return { wins: 0, losses: 0, draws: 0, total: 0, winRate: 0 };
    }

    const encounters = await CompetitionEncounter.createQueryBuilder('e')
      .select(['e.homeTeamId', 'e.awayTeamId', 'e.homeScore', 'e.awayScore'])
      .where('e.homeTeamId IN (:...teamIds) OR e.awayTeamId IN (:...teamIds)', { teamIds })
      .andWhere('e.homeScore IS NOT NULL AND e.awayScore IS NOT NULL')
      .getMany();

    let wins = 0;
    let losses = 0;
    let draws = 0;
    const teamSet = new Set(teamIds);
    for (const enc of encounters) {
      const home = enc.homeScore ?? 0;
      const away = enc.awayScore ?? 0;
      const isHome = enc.homeTeamId && teamSet.has(enc.homeTeamId);
      const ourScore = isHome ? home : away;
      const theirScore = isHome ? away : home;
      if (ourScore > theirScore) wins++;
      else if (ourScore < theirScore) losses++;
      else draws++;
    }
    const total = wins + losses + draws;
    return {
      wins,
      losses,
      draws,
      total,
      winRate: total === 0 ? 0 : wins / total,
    };
  }

  /**
   * Next upcoming home encounter for the club.
   */
  @ResolveField(() => CompetitionEncounter, { nullable: true })
  async nextHomeMatch(
    @Parent() { id }: Club,
    @Args('season', { type: () => Int, nullable: true }) season?: number,
  ): Promise<CompetitionEncounter | null> {
    const teamIdsQb = Team.createQueryBuilder('t').select('t.id', 'id').where('t.clubId = :clubId', { clubId: id });
    if (season != null) {
      teamIdsQb.andWhere('t.season = :season', { season });
    }
    const teamRows = await teamIdsQb.getRawMany<{ id: string }>();
    const teamIds = teamRows.map((r) => r.id);
    if (teamIds.length === 0) return null;

    return (
      (await CompetitionEncounter.createQueryBuilder('e')
        .where('e.homeTeamId IN (:...teamIds)', { teamIds })
        .andWhere('e.date > :now', { now: new Date().toISOString() })
        .orderBy('e.date', 'ASC')
        .getOne()) ?? null
    );
  }

  /**
   * Upcoming encounters (home or away) for the club, soonest first.
   * Used by the club detail sidebar "Upcoming · Club" card.
   */
  @ResolveField(() => [CompetitionEncounter])
  async upcomingEncounters(
    @Parent() { id }: Club,
    @Args('take', { type: () => Int, nullable: true, defaultValue: 5 }) take?: number,
    @Args('season', { type: () => Int, nullable: true }) season?: number,
  ): Promise<CompetitionEncounter[]> {
    const teamIdsQb = Team.createQueryBuilder('t').select('t.id', 'id').where('t.clubId = :clubId', { clubId: id });
    if (season != null) {
      teamIdsQb.andWhere('t.season = :season', { season });
    }
    const teamRows = await teamIdsQb.getRawMany<{ id: string }>();
    const teamIds = teamRows.map((r) => r.id);
    if (teamIds.length === 0) return [];

    return CompetitionEncounter.createQueryBuilder('e')
      .where('(e.homeTeamId IN (:...teamIds) OR e.awayTeamId IN (:...teamIds))', { teamIds })
      .andWhere('e.date > :now', { now: new Date().toISOString() })
      .orderBy('e.date', 'ASC')
      .take(Math.max(1, Math.min(take ?? 5, 20)))
      .getMany();
  }

  /**
   * Top performers by win rate for the club in a given season.
   * Aggregates all games played by players currently in the club's teams for that season.
   * A game is only counted when both set1 scores are present and a winner is set.
   * Returns up to `take` players, sorted by winRate desc (tie-break by total games desc).
   */
  @ResolveField(() => [ClubTopPerformer])
  async topPerformers(
    @Parent() { id }: Club,
    @Args('season', { type: () => Int, nullable: true }) season?: number,
    @Args('take', { type: () => Int, nullable: true, defaultValue: 5 }) take?: number,
    @Args('minGames', { type: () => Int, nullable: true, defaultValue: 3 }) minGames?: number,
  ): Promise<ClubTopPerformer[]> {
    const limit = Math.max(1, Math.min(take ?? 5, 20));
    const minG = Math.max(1, minGames ?? 3);

    // Teams scoped to the club (and optional season).
    const teamIdsQb = Team.createQueryBuilder('t').select('t.id', 'id').where('t.clubId = :clubId', { clubId: id });
    if (season != null) {
      teamIdsQb.andWhere('t.season = :season', { season });
    }
    const teamRows = await teamIdsQb.getRawMany<{ id: string }>();
    const teamIds = teamRows.map((r) => r.id);
    if (teamIds.length === 0) return [];

    // Distinct player ids that belong to those teams (active or otherwise).
    const playerRows = await TeamPlayerMembership.createQueryBuilder('tpm')
      .select('DISTINCT tpm."playerId"', 'playerId')
      .where('tpm.teamId IN (:...teamIds)', { teamIds })
      .getRawMany<{ playerId: string }>();
    const playerIds = playerRows.map((r) => r.playerId).filter(Boolean);
    if (playerIds.length === 0) return [];

    // Season window: September 1st to August 31st of the following year.
    const seasonStart = season != null ? `${season}-09-01` : null;
    const seasonEnd = season != null ? `${season + 1}-09-01` : null;

    // Aggregate wins/losses per player in one query.
    const aggQb = GamePlayerMembership.createQueryBuilder('gpm')
      .innerJoin(Game, 'game', 'game.id = gpm.gameId')
      .select('gpm."playerId"', 'playerId')
      .addSelect('COUNT(*)', 'total')
      .addSelect('SUM(CASE WHEN gpm.team = game.winner THEN 1 ELSE 0 END)', 'wins')
      .where('gpm."playerId" IN (:...playerIds)', { playerIds })
      .andWhere('game.winner IS NOT NULL')
      .andWhere('game.set1Team1 > 0')
      .andWhere('game.set1Team2 > 0')
      .groupBy('gpm."playerId"');

    if (seasonStart && seasonEnd) {
      aggQb
        .andWhere('game.playedAt >= :seasonStart', { seasonStart })
        .andWhere('game.playedAt < :seasonEnd', { seasonEnd });
    }

    const rawAgg = await aggQb.getRawMany<{ playerId: string; total: string; wins: string }>();
    const aggregated = rawAgg
      .map((r) => ({
        playerId: r.playerId,
        total: Number(r.total) || 0,
        wins: Number(r.wins) || 0,
      }))
      .filter((r) => r.total >= minG)
      .sort((a, b) => {
        const rateA = a.wins / a.total;
        const rateB = b.wins / b.total;
        if (rateB !== rateA) return rateB - rateA;
        return b.total - a.total;
      })
      .slice(0, limit);

    if (aggregated.length === 0) return [];

    const players = await Player.findByIds(aggregated.map((a) => a.playerId));
    const playerMap = new Map(players.map((p) => [p.id, p]));

    return aggregated
      .map((a) => {
        const player = playerMap.get(a.playerId);
        if (!player) return null;
        return {
          player,
          wins: a.wins,
          total: a.total,
          winRate: a.total > 0 ? a.wins / a.total : 0,
        } satisfies ClubTopPerformer;
      })
      .filter((v): v is ClubTopPerformer => v !== null);
  }
}
