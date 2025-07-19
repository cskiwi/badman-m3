import { TournamentSubEvent, TournamentDraw, TournamentEvent } from '@app/models';
import { NotFoundException } from '@nestjs/common';
import { Args, ID, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { TournamentSubEventArgs } from '../../../args';

@Resolver(() => TournamentSubEvent)
export class TournamentSubEventResolver {
  @Query(() => TournamentSubEvent)
  async tournamentSubEvent(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<TournamentSubEvent> {
    const comp = await TournamentSubEvent.findOne({
      where: {
        id,
      },
    });

    if (comp) {
      return comp;
    }

    throw new NotFoundException(id);
  }

  @Query(() => [TournamentSubEvent])
  async tournamentSubEvents(
    @Args('args',  { type: () => TournamentSubEventArgs, nullable: true  })
    inputArgs?: InstanceType<typeof TournamentSubEventArgs>,
  ): Promise<TournamentSubEvent[]> {
    const args = TournamentSubEventArgs.toFindOneOptions(inputArgs);
    return TournamentSubEvent.find(args);
  }

  @ResolveField(() => [TournamentDraw], { nullable: true })
  async drawTournaments(@Parent() { id }: TournamentSubEvent): Promise<TournamentDraw[]> {
    return TournamentDraw.find({
      where: {
        subeventId: id,
      },
    });
  }

  @ResolveField(() => TournamentEvent, { nullable: true })
  async tournamentEvent(@Parent() { eventId }: TournamentSubEvent): Promise<TournamentEvent | null> {
    if (!eventId) {
      return null;
    }

    return TournamentEvent.findOne({
      where: { id: eventId },
    });
  }
}
