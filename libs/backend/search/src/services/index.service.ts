import { Club, EventCompetition, EventTournament, Player } from '@app/models';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SearchClient } from 'algoliasearch';
import { SEARCH_CLIENTS, ALGOLIA_CLIENT, TYPESENSE_CLIENT } from '../client';
import moment from 'moment';
import { Client } from 'typesense';

enum multiMatchOrder {
  club,
  player,
  eventCompetition,
  eventTournament,
}

@Injectable()
export class IndexService implements OnModuleInit {
  private readonly _logger = new Logger(IndexService.name);

  constructor(
    @Inject(ALGOLIA_CLIENT) private readonly algoliaClient: SearchClient,
    @Inject(TYPESENSE_CLIENT) private readonly typeSenseClient: Client,
  ) {}

  async onModuleInit(): Promise<void> {
    this._logger.log('Indexing started...');

    // temo delete all schemas on startup

    // await this.typeSenseClient.collections('players').delete();
    // await this.typeSenseClient.collections('clubs').delete();
    // await this.typeSenseClient.collections('events').delete();

    const currentCollection = await this.typeSenseClient
      .collections()
      .retrieve();

    if (
      !currentCollection.some((collection) => collection.name === 'players')
    ) {
      await this.typeSenseClient.collections().create({
        name: 'players',
        enable_nested_fields: true,
        fields: [
          { name: 'objectID', type: 'string' },
          { name: 'firstName', type: 'string' },
          { name: 'lastName', type: 'string' },
          { name: 'fullName', type: 'string' },
          { name: 'slug', type: 'string' },
          { name: 'memberId', type: 'string' },
          { name: 'club', type: 'object' },
          { name: 'order', type: 'int32' },
        ],
        default_sorting_field: 'order',
      });
    }

    if (!currentCollection.some((collection) => collection.name === 'clubs')) {
      await this.typeSenseClient.collections().create({
        name: 'clubs',
        fields: [
          { name: 'objectID', type: 'string' },
          { name: 'name', type: 'string' },
          { name: 'fullName', type: 'string' },
          { name: 'slug', type: 'string' },
          { name: 'clubId', type: 'int32' },
          { name: 'type', type: 'string' },
          { name: 'order', type: 'int32' },
        ],
        default_sorting_field: 'order',
      });
    }

    if (!currentCollection.some((collection) => collection.name === 'events')) {
      await this.typeSenseClient.collections().create({
        name: 'events',
        fields: [
          { name: 'objectID', type: 'string' },
          { name: 'name', type: 'string' },
          { name: 'slug', type: 'string' },
          { name: 'type', type: 'string' },
          { name: 'date', type: 'int64' },
          { name: 'order', type: 'int32' },
        ],
        default_sorting_field: 'order',
      });
    }

    this._logger.log('Schemas made...');
  }

  async addObjects<T = unknown>(
    indexName: string,
    objects: Array<Record<string, T>>,
  ) {
    if (SEARCH_CLIENTS.includes(TYPESENSE_CLIENT)) {
      this._logger.log(`Indexing ${objects.length} objects to ${indexName}`);
      try {
        await this.typeSenseClient
          .collections(indexName)
          .documents()
          .import(objects);
      } catch (e) {
        this._logger.error(e);
      } finally {
        this._logger.log(`Indexed ${objects.length} objects to ${indexName}`);
      }
    }

    if (SEARCH_CLIENTS.includes(ALGOLIA_CLIENT)) {
      await this.algoliaClient.saveObjects({
        indexName,
        objects,
      });

      // combined index
      await this.algoliaClient.saveObjects({
        indexName: 'searchable',
        objects,
      });
    }
  }

  async indexPlayers() {
    const playerQry = Player.createQueryBuilder('player')
      .select([
        'player.id',
        'player.slug',
        'player.memberId',
        'player.firstName',
        'player.lastName',
        'club.id',
      ])
      .leftJoinAndSelect(
        'player.clubPlayerMemberships',
        'clubPlayerMemberships',
      )
      .leftJoinAndSelect('clubPlayerMemberships.club', 'club')
      .where('player.competitionPlayer = true');

    const players = await playerQry.getMany();

    if (!players) {
      return;
    }

    let objects = players.map((player) => {
      const activeClub = player.clubPlayerMemberships?.find(
        (membership) => membership.active,
      )?.club;
      return {
        id: player.id,
        objectID: player.id,
        firstName: player.firstName,
        lastName: player.lastName,
        fullName: player.fullName,
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
    });

    await this.addObjects('players', objects);
  }

  async indexClubs() {
    const clubsQry = Club.createQueryBuilder('club')
      .select([
        'club.id',
        'club.name',
        'club.fullName',
        'club.clubId',
        'club.slug',
      ])
      .where('club.clubId IS NOT NULL');

    const clubs = await clubsQry.getMany();

    if (!clubs) {
      return;
    }

    const objects = clubs.map((club) => {
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
    });

    await this.addObjects('clubs', objects);
  }

  async indexCompetitionEvents() {
    const eventsQry = EventCompetition.createQueryBuilder('event')
      .select(['event.id', 'event.name', 'event.season'])
      .where('event.official = true');

    const events = await eventsQry.getMany();

    if (!events) {
      return;
    }

    const objects = events.map((event) => {
      return {
        id: event.id,
        objectID: event.id,
        slug: event.slug,
        name: event.name,
        type: 'competition',
        date: moment(`${event.season}-09-01`).toDate().getTime(),
        order: multiMatchOrder.eventCompetition,
      };
    });

    await this.addObjects('events', objects);
  }

  async indexTournamentEvents() {
    const eventsQry = EventTournament.createQueryBuilder('event')
      .select(['event.id', 'event.name', 'event.firstDay'])
      .where('event.official = true');

    const events = await eventsQry.getMany();

    if (!events) {
      return;
    }

    const objects = events.map((event) => {
      return {
        id: event.id,
        objectID: event.id,
        slug: event.slug,
        name: event.name,
        type: 'tournament',
        date: event.firstDay.getTime(),
        order: multiMatchOrder.eventTournament,
      };
    });

    await this.addObjects('events', objects);
  }
}
