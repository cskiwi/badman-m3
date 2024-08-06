import { Club, EventCompetition, EventTournament, Player } from '@app/models';
import { Inject, Injectable } from '@nestjs/common';
import { SearchClient } from 'algoliasearch';
import { ALGOLIA_CLIENT } from '../client';
import moment from 'moment';

enum multiMatchOrder {
  club,
  player,
  eventCompetition,
  eventTournament,
}

@Injectable()
export class IndexService {
  constructor(
    @Inject(ALGOLIA_CLIENT) private readonly algoliaClient: SearchClient,
  ) {}

  getIndex(indexName: string) {
    return this.algoliaClient.initIndex(indexName);
  }

  addObjects<T = any>(
    indexName: string,
    objects: ReadonlyArray<Readonly<Record<string, T>>>,
  ) {
    return this.algoliaClient.initIndex(indexName).saveObjects(objects);
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
        'club.name',
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

    return this.addObjects(
      'searchable',
      players.map((player) => {
        const activeClub = player.clubPlayerMemberships?.find(
          (membership) => membership.active,
        )?.club;
        return {
          objectID: player.id,
          firstName: player.firstName,
          slug: player.slug,
          lastName: player.lastName,
          memberId: player.memberId,
          club: {
            id: activeClub?.id,
            name: activeClub?.name,
          },
          order: multiMatchOrder.player,
        };
      }),
    );
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

    return this.addObjects(
      'searchable',
      clubs.map((club) => {
        return {
          objectID: club.id,
          slug: club.slug,
          name: club.name,
          fullName: club.fullName,
          clubId: club.clubId,
          order: multiMatchOrder.club
        };
      }),
    );
  }

  async indexCompetitionEvents() {
    const eventsQry = EventCompetition.createQueryBuilder('event')
      .select(['event.id', 'event.name', 'event.season'])
      .where('event.official = true');

    const events = await eventsQry.getMany();

    if (!events) {
      return;
    }

    return this.addObjects(
      'searchable',
      events.map((event) => {
        return {
          objectID: event.id,
          slug: event.slug,
          name: event.name,
          date: moment(`${event.season}-09-01`).toDate().getTime(),
          order: multiMatchOrder.eventCompetition
        };
      }),
    );
  }

  async indexTournamentEvents() {
    const eventsQry = EventTournament.createQueryBuilder('event')
      .select(['event.id', 'event.name', 'event.firstDay'])
      .where('event.official = true');

    const events = await eventsQry.getMany();

    if (!events) {
      return;
    }

    return this.addObjects(
      'searchable',
      events.map((event) => {
        return {
          objectID: event.id,
          slug: event.slug,
          name: event.name,
          date: event.firstDay.getTime(),
          order: multiMatchOrder.eventTournament
        };
      }),
    );
  }
}
