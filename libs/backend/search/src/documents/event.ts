import { CollectionCreateSchema } from 'typesense/lib/Typesense/Collections';

export const EventDocument: CollectionCreateSchema<Record<string, unknown>> = {
  name: 'events',
  fields: [
    { name: 'objectID', type: 'string' },
    { name: 'name', type: 'string' },
    { name: 'slug', type: 'string', optional: true },
    { name: 'type', type: 'string' },
    { name: 'date', type: 'int64', optional: true },
    { name: 'order', type: 'int32' },
  ],
  default_sorting_field: 'order',
};
