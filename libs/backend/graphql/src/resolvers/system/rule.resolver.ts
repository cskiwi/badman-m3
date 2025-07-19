import { Rule } from '@app/models';
import { IsUUID } from '@app/utils';
import { NotFoundException } from '@nestjs/common';
import { Args, ID, Query, Resolver } from '@nestjs/graphql';
import { RuleArgs } from '../../args';

@Resolver(() => Rule)
export class RuleResolver {
  @Query(() => Rule)
  async rule(@Args('id', { type: () => ID }) id: string): Promise<Rule> {
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
  async rules(
    @Args('args', { type: () => RuleArgs, nullable: true })
    inputArgs?: InstanceType<typeof RuleArgs>,
  ): Promise<Rule[]> {
    const args = RuleArgs.toFindManyOptions(inputArgs);
    return Rule.find(args);
  }
}