import { AlgoliaSearchOptions } from 'algoliasearch';

export interface ISearchConfig {
  applicationId: string;
  apiKey: string;
  clientOptions?: AlgoliaSearchOptions;
}
