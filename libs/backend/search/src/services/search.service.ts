import { Inject, Injectable } from '@nestjs/common';
import { Client } from 'typesense';
import { ClubDocument, EventDocument, PlayerDocument } from '../documents';
import { IndexType, TYPESENSE_CLIENT } from '../utils';

@Injectable()
export class SearchService {
  constructor(
    @Inject(TYPESENSE_CLIENT)
    private readonly typeSenseClient: Client,
  ) {}

  async search<T extends { order: number } = { order: number }>(query: string, types: IndexType[]) {
    const searches = types.map((type) => {
      switch (type) {
        case IndexType.PLAYERS:
          return { collection: 'players', query_by: 'firstName,lastName,fullName,memberId', q: query };
        case IndexType.CLUBS:
          return { collection: 'clubs', query_by: 'name', q: query };
        case IndexType.COMPETITION_EVENTS:
        case IndexType.TOURNAMENT_EVENTS:
          return { collection: 'events', query_by: 'name', q: query };
      }
    });

    return await this._searchTypeSense<T>({ searches });
  }

  private async _searchTypeSense<T extends { order: number } = { order: number }>(queries: {
    searches: { collection: string; q: string; filter_by?: string; query_by?: string; sort_by?: string; facet_by?: string; max_hits?: number }[];
  }) {
    const hits = await this.typeSenseClient.multiSearch.perform<[typeof PlayerDocument, typeof ClubDocument, typeof EventDocument]>(queries);

    const results: SearchResult<T>[] = [];

    for (const result of hits.results) {
      if (result.hits) {
        results.push(...result.hits.map((hit) => ({ hit: hit.document as never, score: hit.text_match })));
      }
    }

    // sort first by sore, then by hit.order
    return results.sort((a, b) => {
      // ignore sorting if no score
      if (!a.score || !b.score) {
        return 0;
      }

      if (a.score === b.score) {
        return a.hit.order - b.hit.order;
      }
      return b.score - a.score;
    });
  }
}

export interface SearchResult<T extends { order: number }> {
  hit: T;
  type?: IndexType;
  score?: number;
}
