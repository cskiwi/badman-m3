import { Field, InputType, Int } from '@nestjs/graphql';
import { Min } from 'class-validator';
import { GraphQLJSONObject } from 'graphql-type-json';
import { FindOptionsOrder, FindOptionsWhere } from 'typeorm';
import { GraphQLWhereConverter, GraphQLWhereInput } from './queryFixer';
import { sortOrders } from './sort-order';
import { whereInputs } from './where-input';

export function args<T>(name?: string) {
  const SortOrder = sortOrders.get(`${name}SortOrder`);
  if (!SortOrder) {
    throw new Error(`SortOrderType for ${name} not found`);
  }

  const WhereInput = whereInputs.get(`${name}WhereInput`);
  if (!WhereInput) {
    throw new Error(`WhereInputType for ${name} not found`);
  }

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

    @Field(() => [WhereInput], { nullable: true })
    where?: GraphQLWhereInput<T>[];

    static toFindManyOptions(args?: Args) {
      return {
        take: args?.take == null ? undefined : args?.take,
        skip: args?.skip,
        where: this.getQuery(args?.where),
        order: args?.order,
        relations: this.getRelations(args?.order),
      };
    }

    static toFindOneOptions(args?: Args) {
      return {
        where: this.getQuery(args?.where),
        order: args?.order,
      };
    }

    static getQuery<T>(args?: GraphQLWhereInput<T> | GraphQLWhereInput<T>[]): FindOptionsWhere<T>[] {
      if (!args || (Array.isArray(args) && args.length === 0)) {
        return [];
      }

      const where = GraphQLWhereConverter.convert(args);
      return Array.isArray(where) ? where as FindOptionsWhere<T>[] : [where as FindOptionsWhere<T>];
    }

    static getRelations(order?: { [key: string]: unknown }) {
      // we need to include all assocations based on the order
      // these are all that are more then one level deep

      const relations = new Set<string>();
      if (!order) {
        return [];
      }

      const fields = Object.keys(order);

      for (const field of fields) {
        // get the value of the field
        const value = (order as { [key: string]: unknown })[field];

        // if the value is 'ASC' or 'DESC' we can skip it
        if (value === 'ASC' || value === 'DESC') {
          continue;
        }

        relations.add(field);
      }

      return Array.from(relations);
    }
  }

  return Args;
}
