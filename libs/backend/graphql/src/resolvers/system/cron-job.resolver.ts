import { PermGuard, User } from '@app/backend-authorization';
import { SyncService } from '@app/backend-sync';
import { CronJob, Player } from '@app/models';
import { IsUUID } from '@app/utils';
import { ForbiddenException, NotFoundException, UseGuards } from '@nestjs/common';
import { Args, Field, ID, InputType, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CronJobArgs } from '../../args';

@InputType()
class UpdateCronJobInput {
  @Field({ nullable: true })
  cronExpression?: string;

  @Field({ nullable: true })
  isActive?: boolean;

  @Field({ nullable: true })
  description?: string;
}

@Resolver(() => CronJob)
export class CronJobResolver {
  constructor(private readonly syncService: SyncService) {}

  @Query(() => CronJob)
  @UseGuards(PermGuard)
  async cronJob(@User() user: Player, @Args('id', { type: () => ID }) id: string): Promise<CronJob> {
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

  @Mutation(() => CronJob)
  @UseGuards(PermGuard)
  async triggerCronJob(@User() user: Player, @Args('id', { type: () => ID }) id: string): Promise<CronJob> {
    if (!(await user.hasAnyPermission(['change:job']))) {
      throw new ForbiddenException('Insufficient permissions to trigger cron jobs');
    }
    const cronJob = await CronJob.findOne({ where: { id } });
    if (!cronJob) {
      throw new NotFoundException(`Cron job with id ${id} not found`);
    }
    await this.syncService.triggerCronJob(cronJob.name);
    return CronJob.findOneOrFail({ where: { id } });
  }

  @Mutation(() => CronJob)
  @UseGuards(PermGuard)
  async updateCronJob(@User() user: Player, @Args('id', { type: () => ID }) id: string, @Args('input') input: UpdateCronJobInput): Promise<CronJob> {
    if (!(await user.hasAnyPermission(['change:job']))) {
      throw new ForbiddenException('Insufficient permissions to update cron jobs');
    }
    return this.syncService.updateCronJob(id, input);
  }
}
