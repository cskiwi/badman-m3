import { PermGuard, User } from '@app/backend-authorization';
import { Rule, Player } from '@app/models';
import { IsUUID } from '@app/utils';
import { ForbiddenException, NotFoundException, UseGuards } from '@nestjs/common';
import { Args, ID, Query, Resolver } from '@nestjs/graphql';
import { RuleArgs } from '../../args';

@Resolver(() => Rule)
export class RuleResolver {
  @Query(() => Rule)
  @UseGuards(PermGuard)
  async rule(
    @User() user: Player,
    @Args('id', { type: () => ID }) id: string
  ): Promise<Rule> {
    if (!(await user.hasAnyPermission(['change:rules']))) {
      throw new ForbiddenException('Insufficient permissions to access rules');
    }
    const rule = await Rule.findOne({
      where: {
        id,
      },
    });

    if (rule) {
      return rule;
    }

    throw new NotFoundException(id);
  }

  @Query(() => [Rule])
  @UseGuards(PermGuard)
  async rules(
    @User() user: Player,
    @Args('args', { type: () => RuleArgs, nullable: true })
    inputArgs?: InstanceType<typeof RuleArgs>,
  ): Promise<Rule[]> {
    if (!(await user.hasAnyPermission(['change:rules']))) {
      throw new ForbiddenException('Insufficient permissions to access rules');
    }
    const args = RuleArgs.toFindManyOptions(inputArgs);
    return Rule.find(args);
  }
}