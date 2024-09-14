import { Type } from '@nestjs/common';
import { FieldOptions, Field as GraphQLField, ReturnTypeFunc, ReturnTypeFuncValue } from '@nestjs/graphql';
import 'reflect-metadata';

// Metadata key for storing fields
const FIELD_TRACKER_METADATA_KEY = 'custom:trackedFields';
const OBJECT_TRACKER_METADATA_KEY = 'custom:trackedObject';

// Custom Field decorator that tracks fields
export function SortableField(): PropertyDecorator & MethodDecorator;
export function SortableField(options: FieldOptions): PropertyDecorator & MethodDecorator;
export function SortableField(returnTypeFunction?: ReturnTypeFunc<ReturnTypeFuncValue>, options?: FieldOptions): PropertyDecorator & MethodDecorator;
export function SortableField(
  returnTypeFunction?: ReturnTypeFunc<ReturnTypeFuncValue> | FieldOptions,
  options?: FieldOptions,
): PropertyDecorator & MethodDecorator {
  return function (target: object, propertyKey: string | symbol) {
    // Apply the original @Field decorator from @nestjs/graphql
    if (typeof returnTypeFunction === 'function' || typeof returnTypeFunction === 'object') {
      GraphQLField(returnTypeFunction as ReturnTypeFunc<ReturnTypeFuncValue>, options)(target, propertyKey);
    } else {
      GraphQLField()(target, propertyKey);
    }

    // Retrieve the existing tracked fields or initialize a new array
    const existingFields = Reflect.getMetadata(FIELD_TRACKER_METADATA_KEY, target.constructor) || [];
    // Add the current field to the tracked fields list
    Reflect.defineMetadata(FIELD_TRACKER_METADATA_KEY, [...existingFields, propertyKey], target.constructor);
  };
}

// Custom Field decorator that tracks fields
export function SortableObject(propertyName: string): PropertyDecorator & MethodDecorator {
  return function (target: object, propertyKey: string | symbol) {
    // we need to get the type of the property
    // but typeorm does something weird with the types
    // const propertyType = Reflect.getMetadata('design:type', target, propertyKey);
    // Logger.debug(`propertyType: ${target.constructor.name}:${propertyType?.name}`);

    // Retrieve the existing tracked fields or initialize a new array
    const existingFields = Reflect.getMetadata(OBJECT_TRACKER_METADATA_KEY, target.constructor) || [];

    // Add the class name to the tracked fields list
    Reflect.defineMetadata(OBJECT_TRACKER_METADATA_KEY, [...existingFields, { propertyKey, propertyName }], target.constructor);
  };
}

// Helper function to retrieve tracked fields
export function getSortableFields(target: Type): string[] {
  return Reflect.getMetadata(FIELD_TRACKER_METADATA_KEY, target) || [];
}

// Helper function to retrieve tracked objects
export function getSortableObjects(target: Type): { propertyKey: string; propertyName: string }[] {
  return Reflect.getMetadata(OBJECT_TRACKER_METADATA_KEY, target) || [];
}
