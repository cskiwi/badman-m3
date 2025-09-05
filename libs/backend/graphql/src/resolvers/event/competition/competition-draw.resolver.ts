import { CompetitionDraw, CompetitionSubEvent, CompetitionEncounter } from '@app/models';
import { NotFoundException } from '@nestjs/common';
import { Args, ID, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { CompetitionDrawArgs, CompetitionEncounterArgs } from '../../../args';

@Resolver(() => CompetitionDraw)
export class CompetitionDrawResolver {
  @Query(() => CompetitionDraw)
  async competitionDraw(@Args('id', { type: () => ID }) id: string): Promise<CompetitionDraw> {
    const draw = await CompetitionDraw.findOne({
      where: {
        id,
      },
    });

    if (draw) {
      return draw;
    }

    throw new NotFoundException(id);
  }

  @Query(() => [CompetitionDraw])
  async competitionDraws(
    @Args('args', { type: () => CompetitionDrawArgs, nullable: true })
    inputArgs?: InstanceType<typeof CompetitionDrawArgs>,
  ): Promise<CompetitionDraw[]> {
    const args = CompetitionDrawArgs.toFindManyOptions(inputArgs);
    return CompetitionDraw.find(args);
  }

  @ResolveField(() => CompetitionSubEvent, { nullable: true })
  async competitionSubEvent(@Parent() { subeventId }: CompetitionDraw): Promise<CompetitionSubEvent | null> {
    if (!subeventId) {
      return null;
    }

    return CompetitionSubEvent.findOne({
      where: { id: subeventId },
    });
  }

  @ResolveField(() => [CompetitionEncounter], { nullable: true })
  async competitionEncounters(
    @Parent() { id }: CompetitionDraw,
    @Args('args', {
      type: () => CompetitionEncounterArgs,
      nullable: true,
    })
    inputArgs?: InstanceType<typeof CompetitionEncounterArgs>,
  ): Promise<CompetitionEncounter[]> {
    const args = CompetitionEncounterArgs.toFindManyOptions(inputArgs);

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

    return CompetitionEncounter.find(args);
  }
}