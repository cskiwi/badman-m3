import { PermGuard, User } from '@app/backend-authorization';
import { Player } from '@app/models';
import { UseGuards, Logger } from '@nestjs/common';
import { Args, Field, InputType, Mutation, ObjectType, Resolver, registerEnumType } from '@nestjs/graphql';
import { IsArray, IsEnum, IsOptional } from 'class-validator';
import { IndexService, IndexType } from '@app/backend-search';

// Register the enum for GraphQL
registerEnumType(IndexType, {
  name: 'IndexType',
  description: 'The types of data that can be indexed',
});

@InputType()
export class IndexInput {
  @Field(() => [IndexType], { 
    nullable: true,
    description: 'Select one or more types to index'
  })
  @IsArray()
  @IsEnum(IndexType, { each: true })
  @IsOptional()
  types?: IndexType[];
}

@ObjectType()
export class IndexResult {
  @Field(() => String)
  message!: string;
}

@Resolver()
export class IndexResolver {
  private readonly logger = new Logger(IndexResolver.name);

  constructor(private readonly indexService: IndexService) {}

  @Mutation(() => IndexResult)
  @UseGuards(PermGuard)
  async indexAll(
    @User() user: Player,
    @Args('input', { type: () => IndexInput, nullable: true }) input?: IndexInput
  ): Promise<IndexResult> {
    this.logger.log(`Indexing all data for user ${user?.fullName}`);

    const types = Array.isArray(input?.types)
      ? input.types
      : input?.types
        ? [input.types]
        : [
            IndexType.PLAYERS,
            IndexType.CLUBS,
            IndexType.COMPETITION_EVENTS,
            IndexType.TOURNAMENT_EVENTS,
          ];

    const toIndex = types.map((type) => {
      switch (type) {
        case IndexType.PLAYERS:
          return this.indexService.indexPlayers();
        case IndexType.CLUBS:
          return this.indexService.indexClubs();
        case IndexType.COMPETITION_EVENTS:
          return this.indexService.indexCompetitionEvents();
        case IndexType.TOURNAMENT_EVENTS:
          return this.indexService.indexTournamentEvents();
      }
    });

    await Promise.all(toIndex);

    return { message: 'Indexing completed' };
  }
}
