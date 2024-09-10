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
    const results = {
      algoliaType: [],
      algoliaAll: [],
      typesense: [],
    };
    if (SEARCH_CLIENTS.includes(ALGOLIA_CLIENT)) {
      results.algoliaType = await this._searchAlgolia({
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
      results.algoliaAll = await this._searchAlgolia({
        requests: [
          {
            indexName: 'searchable',
            query,
          },
        ],
      });
    }

    if (SEARCH_CLIENTS.includes(TYPESENSE_CLIENT)) {
      results.typesense = (
        await this._searchTypeSense({
          searches: [
            {
              collection: 'players',
              query_by: 'firstName,lastName,fullName,memberId',
              q: query,
            },
            {
              collection: 'clubs',
              query_by: 'name',
              q: query,
            },
            {
              collection: 'events',
              query_by: 'name',
              q: query,
            },
          ],
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
