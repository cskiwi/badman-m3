import { Field, Int, ObjectType } from '@nestjs/graphql';
import { GraphQLJSONObject } from 'graphql-type-json';

@ObjectType('AssemblyValidationError')
export class AssemblyValidationError {
  @Field(() => String, { nullable: true })
  declare message?: string;

  @Field(() => GraphQLJSONObject, { nullable: true })
  declare params?: Record<string, unknown>;
}

@ObjectType('PlayerRankingType')
export class PlayerRankingType {
  @Field(() => String)
  declare id: string;

  @Field(() => String, { nullable: true })
  declare firstName?: string;

  @Field(() => String, { nullable: true })
  declare lastName?: string;

  @Field(() => Int, { nullable: true })
  declare single?: number;

  @Field(() => Int, { nullable: true })
  declare double?: number;

  @Field(() => Int, { nullable: true })
  declare mix?: number;
}

@ObjectType('AssemblyOutput')
export class AssemblyOutput {
  @Field(() => [AssemblyValidationError], { nullable: 'itemsAndList' })
  declare errors?: AssemblyValidationError[];

  @Field(() => [AssemblyValidationError], { nullable: 'itemsAndList' })
  declare warnings?: AssemblyValidationError[];

  @Field(() => Boolean, { nullable: true })
  declare valid: boolean;

  @Field(() => Int, { nullable: true })
  declare baseTeamIndex?: number;

  @Field(() => Int, { nullable: true })
  declare titularsIndex?: number;

  @Field(() => [PlayerRankingType], { nullable: 'itemsAndList' })
  declare baseTeamPlayers?: PlayerRankingType[];

  @Field(() => [PlayerRankingType], { nullable: 'itemsAndList' })
  declare titularsPlayers?: PlayerRankingType[];

  // Internal fields for ResolveField (not exposed via GraphQL)
  titularsPlayerData?: { id: string }[];
  basePlayersData?: { id: string }[];
  systemId?: string;
}
