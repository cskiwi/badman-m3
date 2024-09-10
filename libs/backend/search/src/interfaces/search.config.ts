import { ClientOptions } from '@algolia/client-common';
export interface ISearchConfig {
  algolia: {
    appId: string;
    apiKey: string;
    clientOptions?: ClientOptions;
  };

  typesense: {
    nodes: {
      host: string;
      port: number;
      protocol: string;
    }[];
    apiKey: string;
    connectionTimeoutSeconds?: number;
  };
}
