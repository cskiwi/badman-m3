import { ClientOptions } from '@algolia/client-common';
export interface ISearchConfig {
  appId: string;
  apiKey: string;
  clientOptions?: ClientOptions;
}
