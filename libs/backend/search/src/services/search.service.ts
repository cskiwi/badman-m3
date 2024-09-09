import { Inject, Injectable } from '@nestjs/common';
import { SearchClient, SearchMethodParams } from 'algoliasearch';
import { Client } from 'typesense';
import { SEARCH_CLIENTS, ALGOLIA_CLIENT, TYPESENSE_CLIENT } from '../client';

@Injectable()
export class SearchService {
  constructor(
    @Inject(ALGOLIA_CLIENT) private readonly algoliaClient: SearchClient,
    @Inject(TYPESENSE_CLIENT) private readonly typeSenseClient: Client,
  ) {}

  async search<T = any>(query: string) {
    if (SEARCH_CLIENTS.includes(ALGOLIA_CLIENT)) {
      return this._searchAlgolia({
        requests: [
          {
            indexName: 'players',
            query,
          },
          {
            indexName: 'clubs',
            query,
          },
          {
            indexName: 'events',
            query,
          },
        ],
      });
    }

    if (SEARCH_CLIENTS.includes(TYPESENSE_CLIENT)) {
      return this._searchTypeSense({
        searches: [
          {
            collection: 'players',
            q: query,
          },
          {
            collection: 'clubs',
            q: query,
          },
          {
            collection: 'events',
            q: query,
          },
        ],
      });
    }
  }

  private async _searchAlgolia<T = any>(queries: SearchMethodParams) {
    return this.algoliaClient.search<T>(queries) as any;
  }

  private async _searchTypeSense<T = any>(queries: {
    searches: { collection: string; q: string; filter_by?: string }[];
  }) {
    return this.typeSenseClient.multiSearch.perform(queries);
  }
}
