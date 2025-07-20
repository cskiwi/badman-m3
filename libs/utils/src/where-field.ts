import { Type } from '@nestjs/common';
import { FieldOptions, Field as GraphQLField, ReturnTypeFunc, ReturnTypeFuncValue } from '@nestjs/graphql';
import 'reflect-metadata';

// Metadata key for storing where fields
const WHERE_FIELD_TRACKER_METADATA_KEY = 'custom:whereTrackedFields';
const WHERE_OBJECT_TRACKER_METADATA_KEY = 'custom:whereTrackedObject';
const WHERE_FIELD_TYPE_METADATA_KEY = 'custom:whereFieldTypes';

// Custom Field decorator that tracks fields for where conditions
export function WhereField(): PropertyDecorator & MethodDecorator;
export function WhereField(options: FieldOptions): PropertyDecorator & MethodDecorator;
export function WhereField(returnTypeFunction?: ReturnTypeFunc<ReturnTypeFuncValue>, options?: FieldOptions): PropertyDecorator & MethodDecorator;
export function WhereField(
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
    const existingFields = Reflect.getMetadata(WHERE_FIELD_TRACKER_METADATA_KEY, target.constructor) || [];
    // Add the current field to the tracked fields list
    Reflect.defineMetadata(WHERE_FIELD_TRACKER_METADATA_KEY, [...existingFields, propertyKey], target.constructor);

    // Store explicit type information if provided
    const existingTypes = Reflect.getMetadata(WHERE_FIELD_TYPE_METADATA_KEY, target.constructor) || {};
    if (typeof returnTypeFunction === 'function') {
      // Store the return type function for later use
      existingTypes[propertyKey as string] = returnTypeFunction;
      Reflect.defineMetadata(WHERE_FIELD_TYPE_METADATA_KEY, existingTypes, target.constructor);
    }
  };
}

// Custom Object decorator that tracks objects for where conditions
export function WhereObject(propertyName: string): PropertyDecorator & MethodDecorator {
  return function (target: object, propertyKey: string | symbol) {
    // Retrieve the existing tracked objects or initialize a new array
    const existingObjects = Reflect.getMetadata(WHERE_OBJECT_TRACKER_METADATA_KEY, target.constructor) || [];

    // Add the object info to the tracked objects list
    Reflect.defineMetadata(WHERE_OBJECT_TRACKER_METADATA_KEY, [...existingObjects, { propertyKey, propertyName }], target.constructor);
  };
}

// Helper function to retrieve tracked where fields
export function getWhereFields(target: Type): string[] {
  return Reflect.getMetadata(WHERE_FIELD_TRACKER_METADATA_KEY, target) || [];
}

// Helper function to retrieve tracked where objects
export function getWhereObjects(target: Type): { propertyKey: string; propertyName: string }[] {
  return Reflect.getMetadata(WHERE_OBJECT_TRACKER_METADATA_KEY, target) || [];
}

// Helper function to retrieve field type information
export function getWhereFieldTypes(target: Type): Record<string, ReturnTypeFunc<ReturnTypeFuncValue>> {
  return Reflect.getMetadata(WHERE_FIELD_TYPE_METADATA_KEY, target) || {};
}