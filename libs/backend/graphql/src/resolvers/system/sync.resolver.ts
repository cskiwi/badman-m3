import { PermGuard, User } from '@app/backend-authorization';
import { Player } from '@app/models';
import { ForbiddenException, UseGuards } from '@nestjs/common';
import { Args, Field, Int, Mutation, ObjectType, Query, Resolver } from '@nestjs/graphql';
import { SyncService } from '@app/sync';

// GraphQL types
@ObjectType()
class QueueStats {
  @Field(() => Int)
  waiting!: number;

  @Field(() => Int)
  active!: number;

  @Field(() => Int)
  completed!: number;

  @Field(() => Int)
  failed!: number;
}

@ObjectType()
class SyncStatus {
  @Field()
  status!: string;

  @Field()
  timestamp!: string;

  @Field(() => QueueStats)
  queues!: QueueStats;
}

@ObjectType()
class SyncJob {
  @Field()
  id!: string;

  @Field()
  name!: string;

  @Field()
  data!: string;

  @Field(() => Int)
  progress!: number;

  
  @Field(() => Date, { nullable: true })
  processedOn?: Date;

  @Field(() => Date, { nullable: true })
  finishedOn?: Date;

  @Field({ nullable: true })
  failedReason?: string;

  @Field()
  status!: string;
}

@ObjectType()
class SyncTriggerResponse {
  @Field()
  message!: string;

  @Field()
  success!: boolean;
}

@Resolver()
export class SyncResolver {
  constructor(
    private readonly syncService: SyncService,
  ) {}

  @Query(() => SyncStatus)
  @UseGuards(PermGuard)
  async syncStatus(@User() user: Player): Promise<SyncStatus> {
    if (!(await user.hasAnyPermission(['change:job']))) {
      throw new ForbiddenException('Insufficient permissions to access sync status');
    }

    const queueStats = await this.syncService.getQueueStats();
    
    return {
      status: 'running',
      timestamp: new Date().toISOString(),
      queues: queueStats,
    };
  }

  @Query(() => [SyncJob])
  @UseGuards(PermGuard)
  async syncJobs(
    @User() user: Player,
    @Args('limit', { type: () => Int, nullable: true, defaultValue: 20 }) limit: number,
    @Args('status', { type: () => String, nullable: true }) status?: string,
  ): Promise<SyncJob[]> {
    if (!(await user.hasAnyPermission(['change:job']))) {
      throw new ForbiddenException('Insufficient permissions to access sync jobs');
    }

    const jobs = await this.syncService.getRecentJobs(limit, status);
    
    return jobs.map((job: any) => ({
      id: job.id?.toString() || '',
      name: job.name || '',
      data: JSON.stringify(job.data || {}),
      progress: job.progress || 0,
      processedOn: job.processedOn ? new Date(job.processedOn) : undefined,
      finishedOn: job.finishedOn ? new Date(job.finishedOn) : undefined,
      failedReason: job.failedReason || undefined,
      status: job.status,
    }));
  }

  @Mutation(() => SyncTriggerResponse)
  @UseGuards(PermGuard)
  async triggerDiscoverySync(@User() user: Player): Promise<SyncTriggerResponse> {
    if (!(await user.hasAnyPermission(['change:job']))) {
      throw new ForbiddenException('Insufficient permissions to trigger discovery sync');
    }

    await this.syncService.queueTournamentDiscovery();
    
    return {
      message: 'Discovery sync queued successfully',
      success: true,
    };
  }

  @Mutation(() => SyncTriggerResponse)
  @UseGuards(PermGuard)
  async triggerCompetitionSync(@User() user: Player): Promise<SyncTriggerResponse> {
    if (!(await user.hasAnyPermission(['change:job']))) {
      throw new ForbiddenException('Insufficient permissions to trigger competition sync');
    }

    await this.syncService.queueCompetitionStructureSync();
    
    return {
      message: 'Competition structure sync queued successfully',
      success: true,
    };
  }

  @Mutation(() => SyncTriggerResponse)
  @UseGuards(PermGuard)
  async triggerTournamentSync(@User() user: Player): Promise<SyncTriggerResponse> {
    if (!(await user.hasAnyPermission(['change:job']))) {
      throw new ForbiddenException('Insufficient permissions to trigger tournament sync');
    }

    await this.syncService.queueTournamentStructureSync();
    
    return {
      message: 'Tournament structure sync queued successfully',
      success: true,
    };
  }
}

