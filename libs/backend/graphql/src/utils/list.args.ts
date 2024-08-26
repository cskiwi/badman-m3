import {
  ArgsType,
  Field,
  Int
} from '@nestjs/graphql';
import { Min } from 'class-validator';
import { GraphQLJSONObject } from 'graphql-type-json';
import { FindManyOptions, FindOptionsOrder, FindOptionsWhere } from 'typeorm';
import { queryFixer } from './queryFixer';
import { SortOrderType } from './sort-order';

@ArgsType()
export class WhereArgs<T> {
  @Field(() => [GraphQLJSONObject], { nullable: true })
  where?: FindOptionsWhere<T>[];
}

@ArgsType()
export class ListArgs<T> extends WhereArgs<T> {
  @Field(() => Int, { nullable: true })
  @Min(0)
  skip = 0;

  @Field(() => Int, { nullable: true })
  @Min(1)
  take?: number | null;

  @Field(() => [SortOrderType], { nullable: true })
  order?: FindOptionsOrder<T>;

  static toFindOptions<T>(args: ListArgs<T>): Omit<
    FindManyOptions<T>,
    'where'
  > & {
    where: FindOptionsWhere<T>[];
  } {
    return {
      take: args.take ?? 10,
      skip: args.skip,
      where: this.getQuery(args.where),
      order: args.order,
    };
  }

  static getQuery<T>(
    args?: FindOptionsWhere<T> | FindOptionsWhere<T>[],
  ): FindOptionsWhere<T>[] {
    const where = queryFixer(args) ?? [];
    return Array.isArray(where) ? where : [where];
  }
}
