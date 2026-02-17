import { PointService } from '@app/backend-ranking';
import { Game, RankingPoint, RankingSystem, TournamentDraw, TournamentSubEvent } from '@app/models';
import { Injectable, Logger } from '@nestjs/common';
import { In } from 'typeorm';
import { TournamentRankingRecalcJobData } from '../../queues/sync.queue';

@Injectable()
export class TournamentRankingRecalcService {
  private readonly logger = new Logger(TournamentRankingRecalcService.name);

  constructor(private readonly pointService: PointService) {}

  async processRankingRecalc(
    data: TournamentRankingRecalcJobData,
    updateProgress: (progress: number) => Promise<void>,
  ): Promise<void> {
    const { tournamentId, action } = data;

    this.logger.log(`Starting ranking point ${action} for tournament ${tournamentId}`);
    await updateProgress(10);

    const games = await this.getGamesForTournament(tournamentId);
    if (games.length === 0) {
      this.logger.log(`No games found for tournament ${tournamentId}`);
      await updateProgress(100);
      return;
    }

    await updateProgress(20);

    if (action === 'remove') {
      await this.removeRankingPoints(games);
    } else {
      await this.createRankingPoints(games, updateProgress);
    }

    await updateProgress(100);
    this.logger.log(`Completed ranking point ${action} for tournament ${tournamentId}`);
  }

  private async getGamesForTournament(tournamentId: string): Promise<Game[]> {
    const subEvents = await TournamentSubEvent.find({ where: { eventId: tournamentId } });
    if (subEvents.length === 0) return [];

    const draws = await TournamentDraw.find({
      where: { subeventId: In(subEvents.map((se) => se.id)) },
    });
    if (draws.length === 0) return [];

    return Game.find({
      where: {
        linkId: In(draws.map((d) => d.id)),
        linkType: 'tournament',
      },
    });
  }

  private async removeRankingPoints(games: Game[]): Promise<void> {
    const gameIds = games.map((g) => g.id);
    const rankingPoints = await RankingPoint.find({
      where: { gameId: In(gameIds) },
    });

    if (rankingPoints.length > 0) {
      await RankingPoint.remove(rankingPoints);
      this.logger.log(`Removed ${rankingPoints.length} ranking points`);
    }
  }

  private async createRankingPoints(
    games: Game[],
    updateProgress: (progress: number) => Promise<void>,
  ): Promise<void> {
    let created = 0;
    for (let i = 0; i < games.length; i++) {
      const gameWithMemberships = await Game.findOne({
        where: { id: games[i].id },
        relations: ['gamePlayerMemberships'],
      });
      if (!gameWithMemberships) continue;

      const activeSystem = await RankingSystem.findActiveSystem(gameWithMemberships.playedAt ?? new Date());
      if (!activeSystem) {
        this.logger.warn(`No active ranking system found for game ${games[i].id}, skipping`);
        continue;
      }

      const points = await this.pointService.createRankingPointForGame(activeSystem, gameWithMemberships);
      created += points.length;

      // Update progress between 20% and 95%
      const progress = 20 + Math.floor((i / games.length) * 75);
      await updateProgress(progress);
    }

    this.logger.log(`Created ${created} ranking points for ${games.length} games`);
  }
}
