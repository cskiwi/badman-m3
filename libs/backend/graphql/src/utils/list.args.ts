import { Type } from '@nestjs/common';
import { Field, InputType, Int } from '@nestjs/graphql';
import { Min } from 'class-validator';
import { GraphQLJSONObject } from 'graphql-type-json';
import { FindOptionsOrder, FindOptionsWhere } from 'typeorm';
import { queryFixer } from './queryFixer';
import { SortOrderType } from './sort-order';

export function args<T>(classRef: Type<T>, name?: string) {
  const SortOrder = SortOrderType(classRef);
  const className = `${name}Args`;

  @InputType(className)
  class Args {
    @Field(() => Int, { nullable: true })
    @Min(0)
    skip = 0;

    @Field(() => Int, { nullable: true })
    @Min(1)
    take?: number | null;

    @Field(() => SortOrder, { nullable: true })
    order?: FindOptionsOrder<T>;

    @Field(() => [GraphQLJSONObject], { nullable: true })
    where?: FindOptionsWhere<T>[];

    static toFindManyOptions(args?: Args) {
      return {
        take: args?.take ?? 10,
        skip: args?.skip,
        where: this.getQuery(args?.where),
        order: args?.order,
      };
    }

    static toFindOneOptions(args?: Args) {
      return {
        where: this.getQuery(args?.where),
        order: args?.order,
      };
    }

    static getQuery<T>(
      args?: FindOptionsWhere<T> | FindOptionsWhere<T>[],
    ): FindOptionsWhere<T>[] {
      const where = queryFixer(args) ?? [];
      return Array.isArray(where) ? where : [where];
    }
  }

  return Args;
}
