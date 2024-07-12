import { ArgsType, Field, Int, InputType } from '@nestjs/graphql';
import { Min } from 'class-validator';
import { GraphQLJSONObject } from 'graphql-type-json';
import { queryFixer } from './queryFixer';
import { FindOptionsWhere } from 'typeorm';

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
  @Field(() => GraphQLJSONObject, { nullable: true })
  where?: FindOptionsWhere<T>;
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
  order?: SortOrderType[];

  static toFindOptions<T>(args: ListArgs<T>) {
    return {
      limit: args.take,
      offset: args.skip,
      where: queryFixer(args.where),
      order: args.order?.map(({ field, direction }) => [field, direction]) ?? [],
    } as FindOptionsWhere<T>;
  }
}
