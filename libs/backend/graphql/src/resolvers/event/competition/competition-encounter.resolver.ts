import { CompetitionAssembly, CompetitionDraw, CompetitionEncounter, Game, Team } from '@app/models';
import { NotFoundException } from '@nestjs/common';
import { Args, ID, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { CompetitionEncounterArgs } from '../../../args';
import { AllowAnonymous } from '@app/backend-authorization';

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
  @AllowAnonymous()
  async competitionEncounters(
    @Args('args', { type: () => CompetitionEncounterArgs, nullable: true })
    inputArgs?: InstanceType<typeof CompetitionEncounterArgs>,
  ): Promise<CompetitionEncounter[]> {
    const args = CompetitionEncounterArgs.toFindManyOptions(inputArgs);
    return CompetitionEncounter.find(args);
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

  @ResolveField(() => Team, { nullable: true })
  async homeTeam(@Parent() { homeTeamId }: CompetitionEncounter): Promise<Team | null> {
    if (!homeTeamId) {
      return null;
    }

    return Team.findOne({
      where: { id: homeTeamId },
    });
  }

  @ResolveField(() => Team, { nullable: true })
  async awayTeam(@Parent() { awayTeamId }: CompetitionEncounter): Promise<Team | null> {
    if (!awayTeamId) {
      return null;
    }

    return Team.findOne({
      where: { id: awayTeamId },
    });
  }
}
