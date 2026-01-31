import { PermGuard, User } from '@app/backend-authorization';
import { SyncService } from '@app/backend-sync';
import { Player } from '@app/models';
import { ForbiddenException, UseGuards } from '@nestjs/common';
import { Args, Field, Float, ID, InputType, Int, Mutation, ObjectType, Query, Resolver } from '@nestjs/graphql';

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
    @Args('limit', { type: () => Int, nullable: true }) limit?: number,
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
  async addTournamentByCode(
    @User() user: Player,
    @Args('visualCode', { type: () => String }) visualCode: string,
  ): Promise<SyncTriggerResponse> {
    if (!(await user.hasAnyPermission(['change:job']))) {
      throw new ForbiddenException('Insufficient permissions to add tournament by code');
    }

    await this.syncService.queueTournamentAddByCode({ visualCode });

    return {
      message: `Tournament add by code (${visualCode}) queued successfully`,
      success: true,
    };
  }

  @Mutation(() => SyncTriggerResponse)
  @UseGuards(PermGuard)
  async addTournamentByCodes(
    @User() user: Player,
    @Args('visualCode', { type: () => [String] }) visualCode: string[],
  ): Promise<SyncTriggerResponse> {
    if (!(await user.hasAnyPermission(['change:job']))) {
      throw new ForbiddenException('Insufficient permissions to add tournament by code');
    }

    for (const code of visualCode){
      await this.syncService.queueTournamentAddByCode({ visualCode: code });
    }

    return {
      message: `Tournament add by code (${visualCode}) queued successfully`,
      success: true,
    };
  }

  @Mutation(() => SyncTriggerResponse)
  @UseGuards(PermGuard)
  async triggerEventsSync(
    @User() user: Player,
    @Args('eventId', { type: () => [ID] }) eventIds: string[],
    @Args('includeSubComponents', { type: () => Boolean, defaultValue: false }) includeSubComponents: boolean,
  ): Promise<SyncTriggerResponse> {
    if (!(await user.hasAnyPermission(['change:job']))) {
      throw new ForbiddenException('Insufficient permissions to trigger event sync!');
    }

    for (const eventId of eventIds) {
      await this.syncService.queueEventSync(eventId, includeSubComponents);
    }

    return {
      message: `Event sync queued successfully for ${eventIds.length} events`,
      success: true,
    };
  }

  @Mutation(() => SyncTriggerResponse)
  @UseGuards(PermGuard)
  async triggerEventSync(
    @User() user: Player,
    @Args('eventId', { type: () => ID }) eventId: string,
    @Args('includeSubComponents', { type: () => Boolean, defaultValue: false }) includeSubComponents: boolean,
  ): Promise<SyncTriggerResponse> {
    if (!(await user.hasAnyPermission(['change:job']))) {
      throw new ForbiddenException('Insufficient permissions to trigger event sync!');
    }

    await this.syncService.queueEventSync(eventId, includeSubComponents);

    return {
      message: `Event sync queued successfully for ${eventId}`,
      success: true,
    };
  }

  @Mutation(() => SyncTriggerResponse)
  @UseGuards(PermGuard)
  async triggerDrawSync(
    @User() user: Player,
    @Args('drawId', { type: () => ID }) drawId: string,
    @Args('includeSubComponents', { type: () => Boolean, defaultValue: false }) includeSubComponents: boolean,
  ): Promise<SyncTriggerResponse> {
    if (!(await user.hasAnyPermission(['change:job']))) {
      throw new ForbiddenException('Insufficient permissions to trigger draw sync');
    }

    await this.syncService.queueDrawSync(drawId, includeSubComponents);

    return {
      message: `Draw sync queued successfully for ${drawId}`,
      success: true,
    };
  }

  @Mutation(() => SyncTriggerResponse)
  @UseGuards(PermGuard)
  async triggerGameSync(
    @User() user: Player,
    @Args('drawId', { type: () => ID }) drawId: string,
    @Args('matchCodes', { type: () => [String], nullable: true }) matchCodes?: string[],
  ): Promise<SyncTriggerResponse> {
    if (!(await user.hasAnyPermission(['change:job']))) {
      throw new ForbiddenException('Insufficient permissions to trigger game sync');
    }

    await this.syncService.queueGameSync(drawId, matchCodes);

    return {
      message: 'Game sync queued successfully',
      success: true,
    };
  }

  @Mutation(() => SyncTriggerResponse)
  @UseGuards(PermGuard)
  async triggerEncounterSync(@User() user: Player, @Args('encounterId', { type: () => ID }) encounterId: string): Promise<SyncTriggerResponse> {
    if (!(await user.hasAnyPermission(['change:job']))) {
      throw new ForbiddenException('Insufficient permissions to trigger encounter sync');
    }

    await this.syncService.queueEncounterSync(encounterId);

    return {
      message: `Encounter sync queued successfully for ${encounterId}`,
      success: true,
    };
  }

  @Mutation(() => SyncTriggerResponse)
  @UseGuards(PermGuard)
  async triggerSubEventSync(
    @User() user: Player,
    @Args('subEventId', { type: () => ID }) subEventId: string,
    @Args('includeSubComponents', { type: () => Boolean, defaultValue: false }) includeSubComponents?: boolean,
  ): Promise<SyncTriggerResponse> {
    if (!(await user.hasAnyPermission(['change:job']))) {
      throw new ForbiddenException('Insufficient permissions to trigger sub-event sync');
    }

    await this.syncService.queueSubEventSync(subEventId, includeSubComponents);

    return {
      message: `Sub-event sync queued successfully for ${subEventId}`,
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
