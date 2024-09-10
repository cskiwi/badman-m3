import { Inject, Injectable } from '@nestjs/common';
import { SearchClient, SearchMethodParams } from 'algoliasearch';
import { Client } from 'typesense';
import { IndexingClient, IndexType } from '../client';

@Injectable()
export class SearchService {
  constructor(
    @Inject(IndexingClient.ALGOLIA_CLIENT)
    private readonly algoliaClient: SearchClient,
    @Inject(IndexingClient.TYPESENSE_CLIENT)
    private readonly typeSenseClient: Client,
  ) {}

  async search<T = any>(
    query: string,
    clients: IndexingClient[],
    types: IndexType[],
  ) {
    const results = {
      algoliaType: [],
      algoliaAll: [],
      typesense: [],
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

      results.typesense = (
        await this._searchTypeSense<T>({
          searches,
        })
      ).results;
    }

    return results;
  }

  private async _searchAlgolia<T = any>(queries: SearchMethodParams) {
    return this.algoliaClient.search<T>(queries) as any;
  }

  private async _searchTypeSense<T = any>(queries: {
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
    return this.typeSenseClient.multiSearch.perform(queries);
  }
}
