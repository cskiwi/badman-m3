import { Inject, Injectable } from '@nestjs/common';
import {
  SearchClient,
  SearchMethodParams,
  SearchResponse as AlSearchResult,
} from 'algoliasearch';
import { Client } from 'typesense';
import { IndexingClient, IndexType } from '../client';
import { ClubDocument, EventDocument, PlayerDocument } from '../documents';
import { resourceLimits } from 'worker_threads';

@Injectable()
export class SearchService {
  constructor(
    @Inject(IndexingClient.ALGOLIA_CLIENT)
    private readonly algoliaClient: SearchClient,
    @Inject(IndexingClient.TYPESENSE_CLIENT)
    private readonly typeSenseClient: Client,
  ) {}

  async search<T extends { order: number } = any>(
    query: string,
    clients: IndexingClient[],
    types: IndexType[],
  ) {
    const results = {
      algoliaType: [] as SearchResult<T>[],
      algoliaAll: [] as SearchResult<T>[],
      typesense: [] as SearchResult<T>[],
    };
    if (clients.includes(IndexingClient.ALGOLIA_CLIENT)) {
      const requests = types.map((type) => {
        switch (type) {
          case IndexType.PLAYERS:
            return {
              indexName: 'players',
              query,
            };
          case IndexType.CLUBS:
            return {
              indexName: 'clubs',
              query,
            };
          case IndexType.COMPETITION_EVENTS:
          case IndexType.TOURNAMENT_EVENTS:
            return {
              indexName: 'events',
              query,
            };
        }
      });

      results.algoliaType = await this._searchAlgolia<T>({
        requests: requests,
      });
      results.algoliaAll = await this._searchAlgolia<T>({
        requests: [
          {
            indexName: 'searchable',
            query,
          },
        ],
      });
    }

    if (clients.includes(IndexingClient.TYPESENSE_CLIENT)) {
      const searches = types.map((type) => {
        switch (type) {
          case IndexType.PLAYERS:
            return {
              collection: 'players',
              query_by: 'firstName,lastName,fullName,memberId',
              q: query,
            };
          case IndexType.CLUBS:
            return {
              collection: 'clubs',
              query_by: 'name',
              q: query,
            };
          case IndexType.COMPETITION_EVENTS:
          case IndexType.TOURNAMENT_EVENTS:
            return {
              collection: 'events',
              query_by: 'name',
              q: query,
            };
        }
      });

      results.typesense = await this._searchTypeSense<T>({
        searches,
      });
    }

    return results;
  }

  private async _searchAlgolia<T extends { order: number } = any>(queries: SearchMethodParams) {
    const hits = await this.algoliaClient.search<T>(queries) as {
      results: AlSearchResult<T>[];
    };

   
    const results: SearchResult<T>[] = [];

    for (const result of hits.results) {
      if (result.hits) {
        results.push(
          ...result.hits.map((hit) => ({
            ...hit as any,
            _highlightResult: undefined,
          })),
        );
      }
    }

    return results;

  }

  private async _searchTypeSense<T extends { order: number } = any>(queries: {
    searches: {
      collection: string;
      q: string;
      filter_by?: string;
      query_by?: string;
      sort_by?: string;
      facet_by?: string;
      max_hits?: number;
    }[];
  }) {
    const hits =
      await this.typeSenseClient.multiSearch.perform<
        [typeof PlayerDocument, typeof ClubDocument, typeof EventDocument]
      >(queries);

    const results: SearchResult<T>[] = [];

    for (const result of hits.results) {
      if (result.hits) {
        results.push(
          ...result.hits.map((hit) => ({
            hit: hit.document as never,
            score: hit.text_match,
          })),
        );
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
