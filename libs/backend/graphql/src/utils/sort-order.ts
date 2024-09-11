import { getSortableFields } from '@app/utils';
import { Type } from '@nestjs/common';
import { Field, InputType, registerEnumType } from '@nestjs/graphql';
import 'reflect-metadata'; // Ensure reflect-metadata is imported for TypeScript metadata

export enum SortDirection {
  ASC = 'ASC',
  DESC = 'DESC',
}

registerEnumType(SortDirection, {
  name: 'SortDirection',
});

export function SortOrderType<T>(classRef: Type<T>, name?: string) {
  const className = `${name}SortOrder`;

  @InputType(className)
  class SortOrder {}

  const fields = getSortableFields(classRef);

  for (const key of fields) {
    // Dynamically add a decorated field to the SortOrder class
    Object.defineProperty(SortOrder.prototype, key, {
      value: undefined,
      writable: true,
      enumerable: true,
    });

    Field(() => SortDirection, { nullable: true })(SortOrder.prototype, key);
  }

  return SortOrder;
}
