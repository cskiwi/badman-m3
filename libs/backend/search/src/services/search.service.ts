import { Inject, Injectable } from '@nestjs/common';
import { SearchClient, SearchMethodParams } from 'algoliasearch';
import { ALGOLIA_CLIENT } from '../client';

@Injectable()
export class SearchService {
  constructor(
    @Inject(ALGOLIA_CLIENT) private readonly algoliaClient: SearchClient,
  ) {}

  async search<T = any>(queries: SearchMethodParams) {
    return this.algoliaClient.search<T>(queries) as any;
  }
}
