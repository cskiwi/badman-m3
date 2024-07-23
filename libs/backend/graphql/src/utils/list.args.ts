import { ArgsType, Field, Int, InputType } from '@nestjs/graphql';
import { Min } from 'class-validator';
import GraphQLJSON, { GraphQLJSONObject } from 'graphql-type-json';
import { queryFixer } from './queryFixer';
import { FindManyOptions, FindOptionsOrder, FindOptionsWhere } from 'typeorm';
import { GraphQLScalarType, GraphQLUnionType, Kind } from 'graphql';

@InputType()
export class SortOrderType {
  @Field(() => String)
  field!: string;

  @Field(() => String)
  direction!: string;
}

export class SortOrder {
  field!: string;
  direction!: string;
}

@ArgsType()
export class WhereArgs<T> {
  @Field(() => JSONObjectOrArray, { nullable: true })
  where?: FindOptionsWhere<T>[] | FindOptionsWhere<T>;
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

const JSONObjectOrArray = new GraphQLScalarType({
  name: 'JSONObjectOrArray',
  description: 'JSON object and an array of JSON objects',
  parseValue(value) {
    if (Array.isArray(value)) {
      return value.map((item) => GraphQLJSONObject.parseValue(item));
    }
    return GraphQLJSONObject.parseValue(value);
  },
  serialize(value) {
    if (Array.isArray(value)) {
      return value.map((item) => GraphQLJSONObject.serialize(item));
    }
    return GraphQLJSONObject.serialize(value);
  },
  parseLiteral(ast) {
    if (ast.kind === Kind.LIST) {
      return ast.values.map((item) => GraphQLJSONObject.parseLiteral(item));
    }
    return GraphQLJSONObject.parseLiteral(ast);
  },
});
