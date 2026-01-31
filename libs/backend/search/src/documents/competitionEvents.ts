import { CollectionCreateSchema } from 'typesense/lib/Typesense/Collections';
import { EventDocument } from './event';

export const CompetitionEventDocument: CollectionCreateSchema<Record<string, unknown>> = {
  ...EventDocument,
  name: 'competitionEvents',
};
