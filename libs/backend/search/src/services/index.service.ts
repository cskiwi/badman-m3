import { Club, CompetitionEvent, TournamentEvent, Player } from '@app/models';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import dayjs from 'dayjs';
import { Client } from 'typesense';
import { TYPESENSE_CLIENT } from '../utils';
import { ClubDocument, CompetitionEventDocument, TournamentEventDocument, PlayerDocument } from '../documents';

enum multiMatchOrder {
  club,
  player,
  competitionEvent,
  tournamentEvent,
}

@Injectable()
export class IndexService implements OnModuleInit {
  private readonly _logger = new Logger(IndexService.name);

  constructor(
    @Inject(TYPESENSE_CLIENT)
    private readonly typeSenseClient: Client,
  ) {}

  async onModuleInit(): Promise<void> {
    this._logger.log('Indexing started...');

    const currentCollection = await this.typeSenseClient.collections().retrieve();

    if (!currentCollection.some((collection) => collection.name === 'players')) {
      await this.typeSenseClient.collections().create<Record<string, unknown>>(PlayerDocument);
    }

    if (!currentCollection.some((collection) => collection.name === 'clubs')) {
      await this.typeSenseClient.collections().create<Record<string, unknown>>(ClubDocument);
    }

    if (!currentCollection.some((collection) => collection.name === 'competitionEvents')) {
      await this.typeSenseClient.collections().create<Record<string, unknown>>(CompetitionEventDocument);
    }

    if (!currentCollection.some((collection) => collection.name === 'tournamentEvents')) {
      await this.typeSenseClient.collections().create<Record<string, unknown>>(TournamentEventDocument);
    }

    this._logger.log('Schemas made... check: https://bfritscher.github.io/typesense-dashboard/#/collections!');
  }

  async addObjects(indexName: string, objects: Record<string, unknown>[]) {
    try {
      await this.typeSenseClient.collections(indexName).documents().import(objects, { action: 'upsert' });
    } catch (e) {
      this._logger.error(e);
    } finally {
      this._logger.log(`Indexed ${objects.length} objects to ${indexName}`);
    }
  }

  // Map methods for converting entities to search documents
  mapPlayer(player: Player): Record<string, unknown> {
    const activeClub = player.clubPlayerMemberships?.find((membership) => membership.active)?.club;
    return {
      id: player.id,
      objectID: player.id,
      firstName: player.firstName,
      lastName: player.lastName,
      fullName: player.fullName,
      gender: player.gender,
      slug: player.slug,
      memberId: player.memberId,
      type: 'player',
      club: {
        id: activeClub?.id,
        name: activeClub?.name,
        clubId: activeClub?.clubId,
      },
      order: multiMatchOrder.player,
    };
  }

  mapClub(club: Club): Record<string, unknown> {
    return {
      id: club.id,
      objectID: club.id,
      slug: club.slug,
      name: club.name,
      fullName: club.fullName || club.name,
      clubId: club.clubId,
      type: 'club',
      order: multiMatchOrder.club,
    };
  }

  mapCompetitionEvent(event: CompetitionEvent): Record<string, unknown> {
    return {
      id: event.id,
      objectID: event.id,
      slug: event.slug,
      name: event.name,
      type: 'competition',
      date: dayjs(`${event.season}-09-01`).toDate().getTime(),
      order: multiMatchOrder.competitionEvent,
    };
  }

  mapTournamentEvent(event: TournamentEvent): Record<string, unknown> {
    return {
      id: event.id,
      objectID: event.id,
      slug: event.slug,
      name: event.name,
      type: 'tournament',
      date: event.firstDay?.getTime(),
      order: multiMatchOrder.tournamentEvent,
    };
  }

  // Single item index methods
  async indexPlayer(player: Player): Promise<void> {
    await this.addObjects('players', [this.mapPlayer(player)]);
  }

  async indexClub(club: Club): Promise<void> {
    await this.addObjects('clubs', [this.mapClub(club)]);
  }

  async indexCompetitionEvent(event: CompetitionEvent): Promise<void> {
    await this.addObjects('competitionEvents', [this.mapCompetitionEvent(event)]);
  }

  async indexTournamentEvent(event: TournamentEvent): Promise<void> {
    await this.addObjects('tournamentEvents', [this.mapTournamentEvent(event)]);
  }

  // Bulk index methods
  async indexPlayers(): Promise<void> {
    const playerQry = Player.createQueryBuilder('player')
      .select(['player.id', 'player.slug', 'player.memberId', 'player.firstName', 'player.lastName', 'player.gender', 'club.id'])
      .leftJoinAndSelect('player.clubPlayerMemberships', 'clubPlayerMemberships')
      .leftJoinAndSelect('clubPlayerMemberships.club', 'club')
      .where('player.competitionPlayer = true');

    const players = await playerQry.getMany();

    if (!players) {
      return;
    }

    const objects = players.map((player) => this.mapPlayer(player));
    await this.addObjects('players', objects);
  }

  async indexClubs(): Promise<void> {
    const clubsQry = Club.createQueryBuilder('club')
      .select(['club.id', 'club.name', 'club.fullName', 'club.clubId', 'club.slug'])
      .where('club.clubId IS NOT NULL');

    const clubs = await clubsQry.getMany();

    if (!clubs) {
      return;
    }

    const objects = clubs.map((club) => this.mapClub(club));
    await this.addObjects('clubs', objects);
  }

  async indexCompetitionEvents(): Promise<void> {
    const eventsQry = CompetitionEvent.createQueryBuilder('event').select(['event.id', 'event.name', 'event.season']).where('event.official = true');

    const events = await eventsQry.getMany();

    if (!events) {
      return;
    }

    const objects = events.map((event) => this.mapCompetitionEvent(event));
    await this.addObjects('competitionEvents', objects);
  }

  async indexTournamentEvents(): Promise<void> {
    const eventsQry = TournamentEvent.createQueryBuilder('event').select(['event.id', 'event.name', 'event.firstDay']).where('event.official = true');

    const events = await eventsQry.getMany();

    if (!events) {
      return;
    }

    const objects = events.map((event) => this.mapTournamentEvent(event));
    await this.addObjects('tournamentEvents', objects);
  }
}
