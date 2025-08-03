import { PermGuard, User } from '@app/backend-authorization';
import { SyncService } from '@app/backend-sync';
import { Player } from '@app/models';
import { ForbiddenException, UseGuards } from '@nestjs/common';
import { Args, Field, Float, InputType, Int, Mutation, ObjectType, Query, Resolver } from '@nestjs/graphql';

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

  @Field(() => Float, { nullable: true })
  timestamp?: number;

  @Field({ nullable: true })
  parentId?: string;
}

@ObjectType()
class SyncTriggerResponse {
  @Field()
  message!: string;

  @Field()
  success!: boolean;
}

@ObjectType()
class QueueStatsDetails {
  @Field(() => Int)
  waiting!: number;

  @Field(() => Int)
  active!: number;

  @Field(() => Int)
  completed!: number;

  @Field(() => Int)
  failed!: number;
}

// Input types for team matching
@InputType()
class UnmatchedTeamInput {
  @Field()
  externalCode!: string;

  @Field()
  externalName!: string;

  @Field()
  normalizedName!: string;

  @Field()
  clubName!: string;

  @Field(() => Int, { nullable: true })
  teamNumber?: number;

  @Field({ nullable: true })
  gender?: string;

  @Field(() => Int, { nullable: true })
  strength?: number;
}

@Resolver()
export class SyncResolver {
  constructor(private readonly syncService: SyncService) {}

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
      timestamp: job.timestamp || undefined,
      parentId: job.parentId || undefined,
    }));
  }

  @Mutation(() => SyncTriggerResponse)
  @UseGuards(PermGuard)
  async triggerDiscoverySync(
    @User() user: Player,
    @Args('refDate', { nullable: true }) refDate?: string,
    @Args('pageSize', { type: () => Int, nullable: true }) pageSize?: number,
    @Args('searchTerm', { nullable: true }) searchTerm?: string,
  ): Promise<SyncTriggerResponse> {
    if (!(await user.hasAnyPermission(['change:job']))) {
      throw new ForbiddenException('Insufficient permissions to trigger discovery sync');
    }

    await this.syncService.queueTournamentDiscovery({ refDate, pageSize, searchTerm });

    return {
      message: 'Discovery sync queued successfully',
      success: true,
    };
  }

  @Mutation(() => SyncTriggerResponse)
  @UseGuards(PermGuard)
  async triggerCompetitionSync(
    @User() user: Player,
    @Args('tournamentCode', { nullable: true }) tournamentCode?: string,
    @Args('eventCodes', { type: () => [String], nullable: true }) eventCodes?: string[],
    @Args('forceUpdate', { type: () => Boolean, defaultValue: false }) forceUpdate?: boolean,
    @Args('includeSubComponents', { type: () => Boolean, defaultValue: false }) includeSubComponents?: boolean,
  ): Promise<SyncTriggerResponse> {
    if (!(await user.hasAnyPermission(['change:job']))) {
      throw new ForbiddenException('Insufficient permissions to trigger competition sync');
    }

    const data = tournamentCode ? { tournamentCode, eventCodes, forceUpdate, includeSubComponents } : undefined;
    await this.syncService.queueCompetitionStructureSync(data);

    return {
      message: 'Competition structure sync queued successfully',
      success: true,
    };
  }

  @Mutation(() => SyncTriggerResponse)
  @UseGuards(PermGuard)
  async triggerTournamentSync(
    @User() user: Player,
    @Args('tournamentCode', { nullable: true }) tournamentCode?: string,
    @Args('eventCodes', { type: () => [String], nullable: true }) eventCodes?: string[],
    @Args('forceUpdate', { type: () => Boolean, defaultValue: false }) forceUpdate?: boolean,
    @Args('includeSubComponents', { type: () => Boolean, defaultValue: false }) includeSubComponents?: boolean,
  ): Promise<SyncTriggerResponse> {
    if (!(await user.hasAnyPermission(['change:job']))) {
      throw new ForbiddenException('Insufficient permissions to trigger tournament sync');
    }

    const data = tournamentCode ? { tournamentCode, eventCodes, forceUpdate, includeSubComponents } : undefined;
    await this.syncService.queueTournamentStructureSync(data);

    return {
      message: 'Tournament structure sync queued successfully',
      success: true,
    };
  }

  @Mutation(() => SyncTriggerResponse)
  @UseGuards(PermGuard)
  async triggerEventSync(
    @User() user: Player,
    @Args('tournamentCode') tournamentCode: string,
    @Args('eventCode') eventCode: string,
    @Args('includeSubComponents', { type: () => Boolean, defaultValue: false }) includeSubComponents: boolean,
  ): Promise<SyncTriggerResponse> {
    if (!(await user.hasAnyPermission(['change:job']))) {
      throw new ForbiddenException('Insufficient permissions to trigger event sync');
    }

    await this.syncService.queueEventSync(tournamentCode, eventCode, includeSubComponents);

    return {
      message: `Event sync queued successfully for ${eventCode}`,
      success: true,
    };
  }

  @Mutation(() => SyncTriggerResponse)
  @UseGuards(PermGuard)
  async triggerDrawSync(
    @User() user: Player,
    @Args('tournamentCode') tournamentCode: string,
    @Args('drawCode') drawCode: string,
    @Args('includeSubComponents', { type: () => Boolean, defaultValue: false }) includeSubComponents: boolean,
  ): Promise<SyncTriggerResponse> {
    if (!(await user.hasAnyPermission(['change:job']))) {
      throw new ForbiddenException('Insufficient permissions to trigger draw sync');
    }

    await this.syncService.queueDrawSync(tournamentCode, drawCode, includeSubComponents);

    return {
      message: `Draw sync queued successfully for ${drawCode}`,
      success: true,
    };
  }

  @Mutation(() => SyncTriggerResponse)
  @UseGuards(PermGuard)
  async triggerGameSync(
    @User() user: Player,
    @Args('tournamentCode') tournamentCode: string,
    @Args('eventCode', { nullable: true }) eventCode?: string,
    @Args('drawCode', { nullable: true }) drawCode?: string,
    @Args('matchCodes', { type: () => [String], nullable: true }) matchCodes?: string[],
    @Args('date', { nullable: true }) date?: string,
  ): Promise<SyncTriggerResponse> {
    if (!(await user.hasAnyPermission(['change:job']))) {
      throw new ForbiddenException('Insufficient permissions to trigger game sync');
    }

    await this.syncService.queueGameSync(tournamentCode, eventCode, drawCode, matchCodes);

    return {
      message: 'Game sync queued successfully',
      success: true,
    };
  }

  @Mutation(() => SyncTriggerResponse)
  @UseGuards(PermGuard)
  async triggerSubEventSync(
    @User() user: Player,
    @Args('tournamentCode') tournamentCode: string,
    @Args('eventCode') eventCode: string,
    @Args('subEventCode', { nullable: true }) subEventCode?: string,
    @Args('includeSubComponents', { type: () => Boolean, defaultValue: false }) includeSubComponents?: boolean,
  ): Promise<SyncTriggerResponse> {
    if (!(await user.hasAnyPermission(['change:job']))) {
      throw new ForbiddenException('Insufficient permissions to trigger sub-event sync');
    }

    await this.syncService.queueSubEventSync(tournamentCode, eventCode, subEventCode, includeSubComponents);

    return {
      message: `Sub-event sync queued successfully for ${subEventCode || 'all sub-events'}`,
      success: true,
    };
  }

  @Mutation(() => SyncTriggerResponse)
  @UseGuards(PermGuard)
  async triggerTeamMatching(
    @User() user: Player,
    @Args('tournamentCode') tournamentCode: string,
    @Args('eventCode', { nullable: true }) eventCode?: string,
    @Args('unmatchedTeams', { type: () => [UnmatchedTeamInput], nullable: true }) unmatchedTeams?: UnmatchedTeamInput[],
  ): Promise<SyncTriggerResponse> {
    if (!(await user.hasAnyPermission(['change:job']))) {
      throw new ForbiddenException('Insufficient permissions to trigger team matching');
    }

    await this.syncService.queueTeamMatching({ tournamentCode, eventCode, unmatchedTeams });

    return {
      message: 'Team matching queued successfully',
      success: true,
    };
  }

  @Query(() => String)
  @UseGuards(PermGuard)
  async syncQueueStatsByName(@User() user: Player): Promise<string> {
    if (!(await user.hasAnyPermission(['change:job']))) {
      throw new ForbiddenException('Insufficient permissions to access queue statistics');
    }

    const stats = await this.syncService.getQueueStatsByName();
    return JSON.stringify(stats);
  }
}
