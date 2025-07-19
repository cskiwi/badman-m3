import { CompetitionDraw, CompetitionSubEvent, CompetitionEncounter } from '@app/models';
import { NotFoundException } from '@nestjs/common';
import { Args, ID, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';

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
  async competitionDraws(): Promise<CompetitionDraw[]> {
    return CompetitionDraw.find();
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
  async competitionEncounters(@Parent() { id }: CompetitionDraw): Promise<CompetitionEncounter[]> {
    return CompetitionEncounter.find({
      where: {
        drawId: id,
      },
    });
  }
}