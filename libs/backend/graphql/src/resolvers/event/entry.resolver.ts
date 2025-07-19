import { Entry } from '@app/models';
import { NotFoundException } from '@nestjs/common';
import { Args, ID, Query, Resolver } from '@nestjs/graphql';
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
}
