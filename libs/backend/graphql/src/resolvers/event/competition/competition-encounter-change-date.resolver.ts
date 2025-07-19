import { CompetitionEncounterChangeDate } from '@app/models';
import { NotFoundException } from '@nestjs/common';
import { Args, ID, Query, Resolver } from '@nestjs/graphql';

@Resolver(() => CompetitionEncounterChangeDate)
export class CompetitionEncounterChangeDateResolver {
  @Query(() => CompetitionEncounterChangeDate)
  async competitionEncounterChangeDate(@Args('id', { type: () => ID }) id: string): Promise<CompetitionEncounterChangeDate> {
    const changeDate = await CompetitionEncounterChangeDate.findOne({
      where: {
        id,
      },
    });

    if (changeDate) {
      return changeDate;
    }

    throw new NotFoundException(id);
  }

  @Query(() => [CompetitionEncounterChangeDate])
  async competitionEncounterChangeDates(): Promise<CompetitionEncounterChangeDate[]> {
    return CompetitionEncounterChangeDate.find();
  }
}