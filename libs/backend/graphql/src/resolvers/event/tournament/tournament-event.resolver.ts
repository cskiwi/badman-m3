import { TournamentEvent, TournamentSubEvent } from '@app/models';
import { NotFoundException } from '@nestjs/common';
import { Args, ID, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { IsUUID } from '@app/utils';
import { TournamentEventArgs, TournamentSubEventArgs } from '../../../args';

@Resolver(() => TournamentEvent)
export class TournamentEventResolver {
  @Query(() => TournamentEvent)
  async tournamentEvent(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<TournamentEvent> {
    const comp = IsUUID(id)
      ? await TournamentEvent.findOne({
          where: {
            id,
          },
        })
      : await TournamentEvent.findOne({
          where: {
            slug: id,
          },
        });

    if (comp) {
      return comp;
    }

    throw new NotFoundException(id);
  }

  @Query(() => [TournamentEvent])
  async tournamentEvents(
    @Args('args',  { type: () => TournamentEventArgs, nullable: true  })
    inputArgs?: InstanceType<typeof TournamentEventArgs>,
  ): Promise<TournamentEvent[]> {
    const args = TournamentEventArgs.toFindOneOptions(inputArgs);
    return TournamentEvent.find(args);
  }

  @ResolveField(() => [TournamentSubEvent], { nullable: true })
  async tournamentSubEvents(
    @Parent() { id }: TournamentEvent,
    @Args('args', {
      type: () => TournamentSubEventArgs,
      nullable: true,
    })
    inputArgs?: InstanceType<typeof TournamentSubEventArgs>,
  ): Promise<TournamentSubEvent[]> {
    const args = TournamentSubEventArgs.toFindManyOptions(inputArgs);

    if (args.where?.length > 0) {
      args.where = args.where.map((where) => ({
        ...where,
        eventId: id,
      }));
    } else {
      args.where = [
        {
          eventId: id,
        },
      ];
    }

    return TournamentSubEvent.find(args);
  }
}
