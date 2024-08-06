import { Inject, Injectable } from '@nestjs/common';
import { SearchClient } from 'algoliasearch';
import { MultipleQueriesQuery } from '@algolia/client-search';
import { ALGOLIA_CLIENT } from '../client';

@Injectable()
export class SearchService {
  constructor(
    @Inject(ALGOLIA_CLIENT) private readonly algoliaClient: SearchClient,
  ) {}

  search<T = any>(queries: MultipleQueriesQuery[]) {
    return this.algoliaClient.search<T>(queries);
  }
}
