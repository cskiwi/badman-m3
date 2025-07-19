import { CompetitionEncounter, CompetitionDraw, Game, CompetitionAssembly } from '@app/models';
import { NotFoundException } from '@nestjs/common';
import { Args, ID, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';

@Resolver(() => CompetitionEncounter)
export class CompetitionEncounterResolver {
  @Query(() => CompetitionEncounter)
  async competitionEncounter(@Args('id', { type: () => ID }) id: string): Promise<CompetitionEncounter> {
    const encounter = await CompetitionEncounter.findOne({
      where: {
        id,
      },
    });

    if (encounter) {
      return encounter;
    }

    throw new NotFoundException(id);
  }

  @Query(() => [CompetitionEncounter])
  async competitionEncounters(): Promise<CompetitionEncounter[]> {
    return CompetitionEncounter.find();
  }

  @ResolveField(() => CompetitionDraw, { nullable: true })
  async drawCompetition(@Parent() { drawId }: CompetitionEncounter): Promise<CompetitionDraw | null> {
    if (!drawId) {
      return null;
    }

    return CompetitionDraw.findOne({
      where: { id: drawId },
    });
  }

  @ResolveField(() => [Game], { nullable: true })
  async games(@Parent() { id }: CompetitionEncounter): Promise<Game[]> {
    return Game.find({
      where: {
        linkId: id,
        linkType: 'competition',
      },
    });
  }

  @ResolveField(() => [CompetitionAssembly], { nullable: true })
  async assemblies(@Parent() { id }: CompetitionEncounter): Promise<CompetitionAssembly[]> {
    return CompetitionAssembly.find({
      where: {
        encounterId: id,
      },
    });
  }
}