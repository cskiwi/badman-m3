import { IndexType } from './client';

export const getTypes = (input?: IndexType | IndexType[]) => {
  return Array.isArray(input)
    ? input
    : input
      ? [input]
      : [IndexType.PLAYERS, IndexType.CLUBS, IndexType.COMPETITION_EVENTS, IndexType.TOURNAMENT_EVENTS];
};
