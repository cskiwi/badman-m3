import { CompetitionEncounterChange } from '@app/models';
import { NotFoundException } from '@nestjs/common';
import { Args, ID, Query, Resolver } from '@nestjs/graphql';

@Resolver(() => CompetitionEncounterChange)
export class CompetitionEncounterChangeResolver {
  @Query(() => CompetitionEncounterChange)
  async competitionEncounterChange(@Args('id', { type: () => ID }) id: string): Promise<CompetitionEncounterChange> {
    const competitionEncounterChange = await CompetitionEncounterChange.findOne({
      where: {
        id,
      },
    });

    if (competitionEncounterChange) {
      return competitionEncounterChange;
    }

    throw new NotFoundException(id);
  }

  @Query(() => [CompetitionEncounterChange])
  async competitionEncounterChanges(): Promise<CompetitionEncounterChange[]> {
    return CompetitionEncounterChange.find();
  }
}