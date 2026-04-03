import { getRankingProtected } from '@app/backend-ranking';
import { Player, RankingSystem } from '@app/models';
import { sortPlayers } from '@app/utils/sorts';
import { NotFoundException } from '@nestjs/common';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { In } from 'typeorm';
import { AssemblyOutput, PlayerRankingType } from '../../../services/assembly/assembly-output';

@Resolver(() => AssemblyOutput)
export class AssemblyOutputResolver {

  @ResolveField(() => [PlayerRankingType])
  async baseTeamPlayers(@Parent() assembly: AssemblyOutput): Promise<PlayerRankingType[]> {
    if (!assembly.basePlayersData?.length) return [];

    const players = await Player.find({
      where: {
        id: In(assembly.basePlayersData.map((p) => p.id)),
      },
      relations: ['rankingLastPlaces'],
    });

    const results = await Promise.all(
      players.map(async (player) => {
        const ranking = player.rankingLastPlaces?.find((r) => r.systemId === assembly.systemId);

        return {
          id: player.id,
          firstName: player.firstName,
          lastName: player.lastName,
          single: ranking?.single,
          double: ranking?.double,
          mix: ranking?.mix,
        } as PlayerRankingType;
      }),
    );

    return results.sort(sortPlayers);
  }
}
