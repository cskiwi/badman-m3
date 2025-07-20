import { getWhereFields, getWhereObjects } from '@app/utils';
import { Logger, Type } from '@nestjs/common';
import { Field, InputType } from '@nestjs/graphql';
import 'reflect-metadata';

// Define where operators with direct value support
@InputType('StringWhereInput')
export class StringWhereOperators {
  // Direct value support (treated as eq)
  @Field(() => String, { nullable: true })
  equals?: string;

  @Field(() => String, { nullable: true })
  eq?: string;

  @Field(() => String, { nullable: true })
  ne?: string;

  @Field(() => [String], { nullable: true })
  in?: string[];

  @Field(() => [String], { nullable: true })
  nin?: string[];

  @Field(() => String, { nullable: true })
  like?: string;

  @Field(() => String, { nullable: true })
  ilike?: string;

  @Field(() => Boolean, { nullable: true })
  isNull?: boolean;

  @Field(() => String, { nullable: true })
  raw?: string;
}

@InputType('NumberWhereInput')
export class NumberWhereOperators {
  // Direct value support (treated as eq)
  @Field(() => Number, { nullable: true })
  equals?: number;

  @Field(() => Number, { nullable: true })
  eq?: number;

  @Field(() => Number, { nullable: true })
  ne?: number;

  @Field(() => [Number], { nullable: true })
  in?: number[];

  @Field(() => [Number], { nullable: true })
  nin?: number[];

  @Field(() => Number, { nullable: true })
  gt?: number;

  @Field(() => Number, { nullable: true })
  gte?: number;

  @Field(() => Number, { nullable: true })
  lt?: number;

  @Field(() => Number, { nullable: true })
  lte?: number;

  @Field(() => [Number], { nullable: true })
  between?: [number, number];

  @Field(() => Boolean, { nullable: true })
  isNull?: boolean;

  @Field(() => String, { nullable: true })
  raw?: string;
}

@InputType('BooleanWhereInput')
export class BooleanWhereOperators {
  // Direct value support (treated as eq)
  @Field(() => Boolean, { nullable: true })
  equals?: boolean;

  @Field(() => Boolean, { nullable: true })
  eq?: boolean;

  @Field(() => Boolean, { nullable: true })
  ne?: boolean;

  @Field(() => Boolean, { nullable: true })
  isNull?: boolean;

  @Field(() => String, { nullable: true })
  raw?: string;
}

@InputType('DateWhereInput')
export class DateWhereOperators {
  // Direct value support (treated as eq)
  @Field(() => Date, { nullable: true })
  equals?: Date;

  @Field(() => Date, { nullable: true })
  eq?: Date;

  @Field(() => Date, { nullable: true })
  ne?: Date;

  @Field(() => [Date], { nullable: true })
  in?: Date[];

  @Field(() => [Date], { nullable: true })
  nin?: Date[];

  @Field(() => Date, { nullable: true })
  gt?: Date;

  @Field(() => Date, { nullable: true })
  gte?: Date;

  @Field(() => Date, { nullable: true })
  lt?: Date;

  @Field(() => Date, { nullable: true })
  lte?: Date;

  @Field(() => [Date], { nullable: true })
  between?: [Date, Date];

  @Field(() => Boolean, { nullable: true })
  isNull?: boolean;

  @Field(() => String, { nullable: true })
  raw?: string;
}

const whereCache = new Map<string, Type>();
export const whereInputs = new Map<string, Type>();

export function WhereInputType<T>(classRef: Type<T>, name: string) {
  const className = `${name}WhereInput`;

  @InputType(className)
  class WhereInput {
    @Field(() => [WhereInput], { nullable: true })
    OR?: WhereInput[];

    @Field(() => [WhereInput], { nullable: true })
    AND?: WhereInput[];
  }

  const fields = getWhereFields(classRef);

  for (const key of fields) {
    // Get the field type from the model
    const fieldType = Reflect.getMetadata('design:type', classRef.prototype, key);
    
    let operatorType: Type;
    let directType: Type;
    
    // Determine the appropriate operator type and direct type based on the field type
    if (fieldType === String) {
      operatorType = StringWhereOperators;
      directType = String;
    } else if (fieldType === Number) {
      operatorType = NumberWhereOperators;
      directType = Number;
    } else if (fieldType === Boolean) {
      operatorType = BooleanWhereOperators;
      directType = Boolean;
    } else if (fieldType === Date) {
      operatorType = DateWhereOperators;
      directType = Date;
    } else {
      // For unknown types, default to string operators
      operatorType = StringWhereOperators;
      directType = String;
    }

    // Add unified field that supports both direct values and operators
    // e.g., firstName: "John" OR firstName: { eq: "John", like: "%John%" }
    Object.defineProperty(WhereInput.prototype, key, {
      value: undefined,
      writable: true,
      enumerable: true,
    });
    Field(() => operatorType, { nullable: true })(WhereInput.prototype, key);
  }

  whereCache.set(name, WhereInput);
  whereInputs.set(className, WhereInput);

  return WhereInput;
}

export function appendWhereObjects<T>(classRef: Type<T>, name: string) {
  const className = `${name}WhereInput`;

  const objects = getWhereObjects(classRef);
  const WhereInput = whereCache.get(name);
  if (!WhereInput) {
    throw new Error(`1. WhereInputType for ${name} not found`);
  }

  // Each of the objects should have a WhereInputType in the whereInputs array
  for (const { propertyKey, propertyName } of objects) {
    const WhereInputProperty = whereCache.get(propertyName);

    if (!WhereInputProperty) {
      throw new Error(`2. WhereInputType for ${propertyName} not found`);
    }

    Logger.debug(`Appending ${propertyName} for ${propertyKey} in ${className}`);

    // Dynamically add a decorated field to the WhereInput class
    Object.defineProperty(WhereInput.prototype, propertyKey, {
      value: undefined,
      writable: true,
      enumerable: true,
    });

    Field(() => WhereInputProperty, { nullable: true })(WhereInput.prototype, propertyKey);
  }

  // Override the whereInputs cache with the new WhereInput
  whereInputs.set(className, WhereInput);
}