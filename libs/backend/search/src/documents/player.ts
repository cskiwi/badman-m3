import { CollectionCreateSchema } from 'typesense/lib/Typesense/Collections';

export const PlayerDocument: CollectionCreateSchema = {
  name: 'players',
  enable_nested_fields: true,
  fields: [
    { name: 'objectID', type: 'string' },
    { name: 'firstName', type: 'string' },
    { name: 'lastName', type: 'string' },
    { name: 'fullName', type: 'string' },
    { name: 'slug', type: 'string' },
    { name: 'memberId', type: 'string', optional: true },
    { name: 'club', type: 'object', optional: true },
    { name: 'order', type: 'int32' },
  ],
  default_sorting_field: 'order',
};
