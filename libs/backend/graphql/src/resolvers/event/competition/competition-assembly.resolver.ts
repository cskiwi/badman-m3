import { CompetitionAssembly } from '@app/models';
import { NotFoundException } from '@nestjs/common';
import { Args, ID, Query, Resolver } from '@nestjs/graphql';

@Resolver(() => CompetitionAssembly)
export class CompetitionAssemblyResolver {
  @Query(() => CompetitionAssembly)
  async competitionAssembly(@Args('id', { type: () => ID }) id: string): Promise<CompetitionAssembly> {
    const assembly = await CompetitionAssembly.findOne({
      where: {
        id,
      },
    });

    if (assembly) {
      return assembly;
    }

    throw new NotFoundException(id);
  }

  @Query(() => [CompetitionAssembly])
  async competitionAssemblies(): Promise<CompetitionAssembly[]> {
    return CompetitionAssembly.find();
  }
}