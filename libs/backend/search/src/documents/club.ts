import { CollectionCreateSchema } from 'typesense/lib/Typesense/Collections';

export const ClubDocument: CollectionCreateSchema = {
  name: 'clubs',
  fields: [
    { name: 'objectID', type: 'string' },
    { name: 'name', type: 'string' },
    { name: 'fullName', type: 'string', optional: true },
    { name: 'slug', type: 'string', optional: true },
    { name: 'clubId', type: 'int32', optional: true },
    { name: 'type', type: 'string' },
    { name: 'order', type: 'int32' },
  ],
  default_sorting_field: 'order',
}