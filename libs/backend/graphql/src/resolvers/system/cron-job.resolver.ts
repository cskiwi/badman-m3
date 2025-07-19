import { PermGuard, User } from '@app/backend-authorization';
import { CronJob, Player } from '@app/models';
import { IsUUID } from '@app/utils';
import { ForbiddenException, NotFoundException, UseGuards } from '@nestjs/common';
import { Args, ID, Query, Resolver } from '@nestjs/graphql';
import { CronJobArgs } from '../../args';

@Resolver(() => CronJob)
export class CronJobResolver {
  @Query(() => CronJob)
  @UseGuards(PermGuard)
  async cronJob(
    @User() user: Player,
    @Args('id', { type: () => ID }) id: string
  ): Promise<CronJob> {
    if (!(await user.hasAnyPermission(['change:job']))) {
      throw new ForbiddenException('Insufficient permissions to access cron jobs');
    }
    const cronJob = await CronJob.findOne({
      where: {
        id,
      },
    });

    if (cronJob) {
      return cronJob;
    }

    throw new NotFoundException(id);
  }

  @Query(() => [CronJob])
  @UseGuards(PermGuard)
  async cronJobs(
    @User() user: Player,
    @Args('args', { type: () => CronJobArgs, nullable: true })
    inputArgs?: InstanceType<typeof CronJobArgs>,
  ): Promise<CronJob[]> {
    if (!(await user.hasAnyPermission(['change:job']))) {
      throw new ForbiddenException('Insufficient permissions to access cron jobs');
    }
    const args = CronJobArgs.toFindManyOptions(inputArgs);
    return CronJob.find(args);
  }
}