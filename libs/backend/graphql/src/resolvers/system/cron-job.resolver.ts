import { CronJob } from '@app/models';
import { IsUUID } from '@app/utils';
import { NotFoundException } from '@nestjs/common';
import { Args, ID, Query, Resolver } from '@nestjs/graphql';
import { CronJobArgs } from '../../args';

@Resolver(() => CronJob)
export class CronJobResolver {
  @Query(() => CronJob)
  async cronJob(@Args('id', { type: () => ID }) id: string): Promise<CronJob> {
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
  async cronJobs(
    @Args('args', { type: () => CronJobArgs, nullable: true })
    inputArgs?: InstanceType<typeof CronJobArgs>,
  ): Promise<CronJob[]> {
    const args = CronJobArgs.toFindManyOptions(inputArgs);
    return CronJob.find(args);
  }
}