import { Type } from '@nestjs/common';
import {
  Field as GraphQLField,
  FieldOptions,
  ReturnTypeFunc,
  ReturnTypeFuncValue,
} from '@nestjs/graphql';
import 'reflect-metadata';

// Metadata key for storing fields
const FIELD_TRACKER_METADATA_KEY = 'custom:trackedFields';

// Custom Field decorator that tracks fields
export function SortableField(): PropertyDecorator & MethodDecorator;
export function SortableField<T>(
  options: FieldOptions,
): PropertyDecorator & MethodDecorator;
export function SortableField<T>(
  returnTypeFunction?: ReturnTypeFunc<ReturnTypeFuncValue>,
  options?: FieldOptions,
): PropertyDecorator & MethodDecorator;
export function SortableField<T>(
  returnTypeFunction?: ReturnTypeFunc<ReturnTypeFuncValue> | FieldOptions,
  options?: FieldOptions,
): PropertyDecorator & MethodDecorator {
  return function (target: object, propertyKey: string | symbol) {
    // Apply the original @Field decorator from @nestjs/graphql
    if (
      typeof returnTypeFunction === 'function' ||
      typeof returnTypeFunction === 'object'
    ) {
      GraphQLField(
        returnTypeFunction as ReturnTypeFunc<ReturnTypeFuncValue>,
        options,
      )(target, propertyKey);
    } else {
      GraphQLField()(target, propertyKey);
    }

    // Retrieve the existing tracked fields or initialize a new array
    const existingFields =
      Reflect.getMetadata(FIELD_TRACKER_METADATA_KEY, target.constructor) || [];
    // Add the current field to the tracked fields list
    Reflect.defineMetadata(
      FIELD_TRACKER_METADATA_KEY,
      [...existingFields, propertyKey],
      target.constructor,
    );
  };
}

// Helper function to retrieve tracked fields
export function getSortableFields(target: Type): (string | symbol)[] {
  return Reflect.getMetadata(FIELD_TRACKER_METADATA_KEY, target) || [];
}
