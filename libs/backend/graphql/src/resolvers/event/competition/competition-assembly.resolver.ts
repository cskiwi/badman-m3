import { User } from '@app/backend-authorization';
import { CompetitionAssembly, CompetitionAssemblyData, Player } from '@app/models';
import { Logger, NotFoundException } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { AssemblyInput } from '../../../inputs/assembly.input';
import { AssemblyOutput } from '../../../services/assembly/assembly-output';
import { AssemblyValidationService } from '../../../services/assembly/assembly-validation.service';

@Resolver(() => CompetitionAssembly)
export class CompetitionAssemblyResolver {
  private readonly logger = new Logger(CompetitionAssemblyResolver.name);

  constructor(private readonly assemblyValidationService: AssemblyValidationService) {}

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

  @Query(() => AssemblyOutput)
  async validateAssembly(@Args('assembly') assembly: AssemblyInput): Promise<AssemblyOutput> {
    return this.assemblyValidationService.validate(assembly);
  }

  @Mutation(() => CompetitionAssembly)
  async createAssembly(
    @User() user: Player,
    @Args('assembly') assembly: AssemblyInput,
  ): Promise<CompetitionAssembly | null> {
    if (!assembly) throw new Error('Assembly is required');
    if (!assembly.encounterId) throw new Error('Encounter is required');
    if (!assembly.teamId) throw new Error('Team is required');
    if (!user?.id) throw new Error('User is required');

    this.logger.debug(
      `Saving assembly for encounter ${assembly.encounterId} and team ${assembly.teamId}, by player ${user.fullName}`,
    );

    try {
      // Check if assembly already exists
      let assemblyDb = await CompetitionAssembly.findOne({
        where: {
          encounterId: assembly.encounterId,
          teamId: assembly.teamId,
        },
      });

      const assemblyData: CompetitionAssemblyData = {
        single1: assembly.single1 ?? undefined,
        single2: assembly.single2 ?? undefined,
        single3: assembly.single3 ?? undefined,
        single4: assembly.single4 ?? undefined,
        double1: (assembly.double1 ?? []).filter((id) => id != null),
        double2: (assembly.double2 ?? []).filter((id) => id != null),
        double3: (assembly.double3 ?? []).filter((id) => id != null),
        double4: (assembly.double4 ?? []).filter((id) => id != null),
        substitutes: assembly.subtitudes ?? [],
      };

      if (assemblyDb) {
        this.logger.debug(
          `UPDATED: Assembly for encounter with ID ${assembly.encounterId} existed in the database and will be updated`,
        );

        // Merge with existing assembly data
        const currentAssembly = assemblyDb.assembly ?? {};
        const updatedAssembly: CompetitionAssemblyData = {
          single1: assembly.single1 !== undefined ? assembly.single1 ?? undefined : currentAssembly.single1,
          single2: assembly.single2 !== undefined ? assembly.single2 ?? undefined : currentAssembly.single2,
          single3: assembly.single3 !== undefined ? assembly.single3 ?? undefined : currentAssembly.single3,
          single4: assembly.single4 !== undefined ? assembly.single4 ?? undefined : currentAssembly.single4,
          double1: assembly.double1 !== undefined ? assemblyData.double1 : currentAssembly.double1 ?? [],
          double2: assembly.double2 !== undefined ? assemblyData.double2 : currentAssembly.double2 ?? [],
          double3: assembly.double3 !== undefined ? assemblyData.double3 : currentAssembly.double3 ?? [],
          double4: assembly.double4 !== undefined ? assemblyData.double4 : currentAssembly.double4 ?? [],
          substitutes: assembly.subtitudes !== undefined ? assemblyData.substitutes : currentAssembly.substitutes ?? [],
        };

        assemblyDb.assembly = updatedAssembly;
        assemblyDb.playerId = user.id;
        if (assembly.captainId !== undefined) assemblyDb.captainId = assembly.captainId;
        if (assembly.description !== undefined) assemblyDb.description = assembly.description;
        if (assembly.isComplete !== undefined) assemblyDb.isComplete = assembly.isComplete;

        return assemblyDb.save();
      }

      this.logger.debug(
        `CREATED: A new assembly for encounter with ID ${assembly.encounterId} was created.`,
      );

      assemblyDb = CompetitionAssembly.create({
        captainId: assembly.captainId,
        description: assembly.description,
        encounterId: assembly.encounterId,
        isComplete: assembly.isComplete,
        teamId: assembly.teamId,
        playerId: user.id,
        assembly: assemblyData,
      });

      return assemblyDb.save();
    } catch (error) {
      this.logger.error(error);
      return null;
    }
  }
}
