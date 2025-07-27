import { Entry, Player } from '@app/models';
import { NotFoundException } from '@nestjs/common';
import { Args, ID, Query, Resolver, ResolveField, Parent } from '@nestjs/graphql';
import { EntryArgs } from '../../args';

@Resolver(() => Entry)
export class EntryResolver {
  @Query(() => Entry)
  async entry(@Args('id', { type: () => ID }) id: string): Promise<Entry> {
    const entry = await Entry.findOne({
      where: {
        id,
      },
    });

    if (entry) {
      return entry;
    }

    throw new NotFoundException(id);
  }

  @Query(() => [Entry])
  async entries(
    @Args('args', { type: () => EntryArgs, nullable: true })
    inputArgs?: InstanceType<typeof EntryArgs>,
  ): Promise<Entry[]> {
    const args = EntryArgs.toFindManyOptions(inputArgs);
    return Entry.find(args);
  }

  @ResolveField(() => Player, { nullable: true })
  async player1(@Parent() entry: Entry): Promise<Player | null> {
    if (!entry.player1Id) {
      return null;
    }

    return Player.findOne({
      where: { id: entry.player1Id },
    });
  }

  @ResolveField(() => Player, { nullable: true })
  async player2(@Parent() entry: Entry): Promise<Player | null> {
    if (!entry.player2Id) {
      return null;
    }

    return Player.findOne({
      where: { id: entry.player2Id },
    });
  }
}
