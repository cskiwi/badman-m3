import { DEFAULT_CLIENTS, IndexingClient } from './client';

export const getClients = (input?: IndexingClient | IndexingClient[]) => {
  return Array.isArray(input) ? input : input ? [input] : DEFAULT_CLIENTS;
};
