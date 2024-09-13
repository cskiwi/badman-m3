import { getSortableFields, getSortableObjects } from '@app/utils';
import { Logger, Type } from '@nestjs/common';
import { Field, InputType, registerEnumType } from '@nestjs/graphql';
import 'reflect-metadata'; // Ensure reflect-metadata is imported for TypeScript metadata

export enum SortDirection {
  ASC = 'ASC',
  DESC = 'DESC',
}

registerEnumType(SortDirection, {
  name: 'SortDirection',
});

const orderCache = new Map<string, Type>();
export const sortOrders = new Map<string, Type>();

export function SortOrderType<T>(classRef: Type<T>, name: string) {
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

  orderCache.set(name, SortOrder);

  return SortOrder;
}

export function appendSortableObjects<T>(classRef: Type<T>, name: string) {
  const className = `${name}SortOrder`;

  const objects = getSortableObjects(classRef);
  const SortOrder = orderCache.get(name);
  if (!SortOrder) {
    throw new Error(`1. SortOrderType for ${name} not found`);
  }
  // So each of the objects should have a SortOrderType in the sortOrders array
  // we need to find it based on the inputType of the sortorders with SortORder suffix
  for (const { propertyKey, propertyName } of objects) {
    const SortOrderProperty = orderCache.get(propertyName);

    if (!SortOrderProperty) {
      throw new Error(`2. SortOrderType for ${propertyName} not found`);
    }

    Logger.debug(`Appending ${propertyName} for ${propertyKey} in ${className}`);

    // Dynamically add a decorated field to the SortOrder class
    Object.defineProperty(SortOrder.prototype, propertyKey, {
      value: undefined,
      writable: true,
      enumerable: true,
    });

    Field(() => SortOrderProperty, { nullable: true })(SortOrder.prototype, propertyKey);
  }

  // override the sortOrderCache with the new sortOrder
  sortOrders.set(className, SortOrder);
}
