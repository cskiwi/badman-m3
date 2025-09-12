import { CollectionCreateSchema } from 'typesense/lib/Typesense/Collections';

export const PlayerDocument: CollectionCreateSchema<{}> = {
  name: 'players',
  fields: [
    { name: 'objectID', type: 'string' },
    { name: 'firstName', type: 'string' },
    { name: 'lastName', type: 'string' },
    { name: 'fullName', type: 'string' },
    { name: 'gender', type: 'string', optional: true },
    { name: 'slug', type: 'string' },
    { name: 'memberId', type: 'string', optional: true },
    { name: 'club', type: 'object', optional: true },
    { name: 'type', type: 'string' },
    { name: 'order', type: 'int32' },
  ], 
  enable_nested_fields: true,
  default_sorting_field: 'order',
};
