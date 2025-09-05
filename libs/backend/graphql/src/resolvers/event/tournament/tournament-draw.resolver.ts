import { TournamentDraw, TournamentSubEvent, Game, Entry } from '@app/models';
import { NotFoundException } from '@nestjs/common';
import { Args, ID, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { TournamentDrawArgs, GameArgs, EntryArgs } from '../../../args';

@Resolver(() => TournamentDraw)
export class TournamentDrawResolver {
  @Query(() => TournamentDraw)
  async tournamentDraw(@Args('id', { type: () => ID }) id: string): Promise<TournamentDraw> {
    const draw = await TournamentDraw.findOne({
      where: {
        id,
      },
    });

    if (draw) {
      return draw;
    }

    throw new NotFoundException(id);
  }

  @Query(() => [TournamentDraw])
  async tournamentDraws(
    @Args('args', { type: () => TournamentDrawArgs, nullable: true })
    inputArgs?: InstanceType<typeof TournamentDrawArgs>,
  ): Promise<TournamentDraw[]> {
    const args = TournamentDrawArgs.toFindManyOptions(inputArgs);
    return TournamentDraw.find(args);
  }

  @ResolveField(() => TournamentSubEvent, { nullable: true })
  async tournamentSubEvent(@Parent() { subeventId }: TournamentDraw): Promise<TournamentSubEvent | null> {
    if (!subeventId) {
      return null;
    }

    return TournamentSubEvent.findOne({
      where: { id: subeventId },
    });
  }

  @ResolveField(() => [Game], { nullable: true })
  async games(
    @Parent() { id }: TournamentDraw,
    @Args('args', {
      type: () => GameArgs,
      nullable: true,
    })
    inputArgs?: InstanceType<typeof GameArgs>,
  ): Promise<Game[]> {
    const args = GameArgs.toFindManyOptions(inputArgs);

    if (args.where?.length > 0) {
      args.where = args.where.map((where) => ({
        ...where,
        linkId: id,
        linkType: 'tournament',
      }));
    } else {
      args.where = [
        {
          linkId: id,
          linkType: 'tournament',
        },
      ];
    }

    return Game.find(args);
  }

  @ResolveField(() => [Entry], { nullable: true })
  async entries(
    @Parent() { id }: TournamentDraw,
    @Args('args', {
      type: () => EntryArgs,
      nullable: true,
    })
    inputArgs?: InstanceType<typeof EntryArgs>,
  ): Promise<Entry[]> {
    const args = EntryArgs.toFindManyOptions(inputArgs);

    if (args.where?.length > 0) {
      args.where = args.where.map((where) => ({
        ...where,
        drawId: id,
      }));
    } else {
      args.where = [
        {
          drawId: id,
        },
      ];
    }

    if (!args.relations?.includes('standing')) {
      args.relations = [...(args.relations || []), 'standing'];
    }

    return Entry.find(args);
  }

 
}
