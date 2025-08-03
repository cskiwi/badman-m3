import { TournamentDraw, TournamentSubEvent, Game, Entry } from '@app/models';
import { NotFoundException } from '@nestjs/common';
import { Args, ID, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';

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
  async tournamentDraws(): Promise<TournamentDraw[]> {
    return TournamentDraw.find();
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
  async games(@Parent() { id }: TournamentDraw): Promise<Game[]> {
    return Game.find({
      where: {
        linkId: id,
        linkType: 'tournament',
      },
    });
  }

  @ResolveField(() => [Entry], { nullable: true })
  async entries(@Parent() { id }: TournamentDraw): Promise<Entry[]> {
    return Entry.find({
      where: {
        drawId: id,
      },
      relations: ['standing'],
    });
  }

 
}
