import { Resolver, ResolveField, Parent } from '@nestjs/graphql';
import { Claim, Player } from '@app/models';

@Resolver(() => Player)
export class PlayerPermissionsResolver {
  @ResolveField(() => [String], { name: 'permissions', nullable: true })
  async permissions(@Parent() player: Player): Promise<string[]> {
    try {
      // Fetch direct claims using the explicit join table
      const claims = await Claim.createQueryBuilder('claim')
        .innerJoin('claim.players', 'player', 'player.id = :id', { id: player.id })
        .getMany();

      // Return claim names
      return claims.map((c) => c.name).filter((name): name is string => !!name);
    } catch (err) {
      console.log('Error in permissions resolver:', err);
      return [];
    }
  }
}
