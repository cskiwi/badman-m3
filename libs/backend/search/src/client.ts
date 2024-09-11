export enum IndexingClient {
  TYPESENSE_CLIENT = 'TYPESENSE_CLIENT',
  ALGOLIA_CLIENT = 'ALGOLIA_CLIENT',
}

export enum IndexType {
  PLAYERS = 'players',
  CLUBS = 'clubs',
  COMPETITION_EVENTS = 'competitionEvents',
  TOURNAMENT_EVENTS = 'tournamentEvents',
}

export const DEFAULT_CLIENTS = [
  /*IndexingClient.TYPESENSE_CLIENT,*/ IndexingClient.ALGOLIA_CLIENT,
];
