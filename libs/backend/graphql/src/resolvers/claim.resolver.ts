import { AllowAnonymous, PermGuard, User } from '@app/backend-authorization';
import { Claim, Player } from '@app/models';
import { SecurityType } from '@app/model/enums';
import { BadRequestException, ForbiddenException, NotFoundException, UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { ClaimArgs } from '../args';

@Resolver(() => Claim)
export class ClaimResolver {
  @Query(() => [Claim])
  @UseGuards(PermGuard)
  @AllowAnonymous()
  async claims(
    @Args('args', { type: () => ClaimArgs, nullable: true })
    inputArgs?: InstanceType<typeof ClaimArgs>,
  ): Promise<Claim[]> {
    const args = ClaimArgs.toFindManyOptions(inputArgs);
    const claims = await Claim.find(args);
    return claims;
  }

  @Query(() => Claim)
  @UseGuards(PermGuard)
  @AllowAnonymous()
  async claim(@Args('id', { type: () => ID }) id: string): Promise<Claim> {
    const claim = await Claim.findOne({
      where: { id },
    });

    if (!claim) {
      throw new NotFoundException(`Claim with id ${id} not found`);
    }

    return claim;
  }

  @Mutation(() => Player)
  @UseGuards(PermGuard)
  async updatePlayerClaims(
    @User() user: Player,
    @Args('playerId', { type: () => ID }) playerId: string,
    @Args('claimIds', { type: () => [ID] }) claimIds: string[],
  ): Promise<Player> {
    // Check if user has permission to modify claims
    const requiredPermission = 'change:claim';
    if (!(await user.hasAnyPermission([requiredPermission]))) {
      throw new ForbiddenException('You do not have permission to modify player claims');
    }

    // Find the target player
    const player = await Player.findOne({
      where: { id: playerId },
      relations: ['claims'],
    });

    if (!player) {
      throw new NotFoundException(`Player with id ${playerId} not found`);
    }

    // Validate that all provided claim IDs exist and are global claims
    const claims = await Claim.find({
      where: claimIds.map(id => ({ id })),
    });

    if (claims.length !== claimIds.length) {
      throw new BadRequestException('One or more claim IDs are invalid');
    }

    // Ensure all claims are global type
    const nonGlobalClaims = claims.filter(claim => claim.type !== SecurityType.GLOBAL);
    if (nonGlobalClaims.length > 0) {
      throw new BadRequestException('Only global claims can be assigned through this endpoint');
    }

    // Update player's claims - replace all existing claims with new ones
    player.claims = claims;
    await player.save();

    // Return updated player with claims
    return Player.findOne({
      where: { id: playerId },
      relations: ['claims'],
    }) as Promise<Player>;
  }
}