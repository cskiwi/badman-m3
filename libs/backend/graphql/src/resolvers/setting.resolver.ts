import { Setting } from '@app/models';
import { NotFoundException } from '@nestjs/common';
import { Args, ID, Query, Resolver } from '@nestjs/graphql';
import { SettingArgs } from '../args';

@Resolver(() => Setting)
export class SettingResolver {
  @Query(() => Setting)
  async setting(@Args('id', { type: () => ID }) id: string): Promise<Setting> {
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
  async settings(
    @Args('args', { type: () => SettingArgs, nullable: true })
    inputArgs?: InstanceType<typeof SettingArgs>,
  ): Promise<Setting[]> {
    const args = SettingArgs.toFindManyOptions(inputArgs);
    return Setting.find(args);
  }
}
