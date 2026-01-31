import { CollectionCreateSchema } from 'typesense/lib/Typesense/Collections';
import { EventDocument } from './event';

export const TournamentEventDocument: CollectionCreateSchema<Record<string, unknown>> = {
  ...EventDocument,
  name: 'tournamentEvents',
};
