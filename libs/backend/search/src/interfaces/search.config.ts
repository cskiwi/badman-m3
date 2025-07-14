export interface ISearchConfig {
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
