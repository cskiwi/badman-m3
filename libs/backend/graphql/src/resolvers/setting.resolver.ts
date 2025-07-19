import { PermGuard, User } from '@app/backend-authorization';
import { Setting, Player } from '@app/models';
import { ForbiddenException, NotFoundException, UseGuards } from '@nestjs/common';
import { Args, ID, Query, Resolver } from '@nestjs/graphql';
import { SettingArgs } from '../args';

@Resolver(() => Setting)
export class SettingResolver {
  @Query(() => Setting)
  @UseGuards(PermGuard)
  async setting(
    @User() user: Player,
    @Args('id', { type: () => ID }) id: string
  ): Promise<Setting> {
    if (!(await user.hasAnyPermission(['edit:state']))) {
      throw new ForbiddenException('Insufficient permissions to access settings');
    }
    const setting = await Setting.findOne({
      where: {
        id,
      },
    });

    if (setting) {
      return setting;
    }

    throw new NotFoundException(id);
  }

  @Query(() => [Setting])
  @UseGuards(PermGuard)
  async settings(
    @User() user: Player,
    @Args('args', { type: () => SettingArgs, nullable: true })
    inputArgs?: InstanceType<typeof SettingArgs>,
  ): Promise<Setting[]> {
    if (!(await user.hasAnyPermission(['edit:state']))) {
      throw new ForbiddenException('Insufficient permissions to access settings');
    }
    const args = SettingArgs.toFindManyOptions(inputArgs);
    return Setting.find(args);
  }
}
