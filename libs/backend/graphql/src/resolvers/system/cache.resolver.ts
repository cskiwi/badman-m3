import { PermGuard, User } from '@app/backend-authorization';
import { TournamentApiClient } from '@app/backend-tournament-api';
import { Player, TournamentEvent, TournamentSubEvent, TournamentDraw, CompetitionEvent, CompetitionSubEvent, CompetitionDraw } from '@app/models';
import { ForbiddenException, Logger, UseGuards } from '@nestjs/common';
import { Args, Field, ID, Int, Mutation, ObjectType, Resolver } from '@nestjs/graphql';

@ObjectType()
class CacheClearResponse {
  @Field()
  success!: boolean;

  @Field()
  message!: string;

  @Field(() => Int)
  keysRemoved!: number;
}

@Resolver()
export class CacheResolver {
  private readonly logger = new Logger(CacheResolver.name);

  constructor(private readonly tournamentApiClient: TournamentApiClient) {}

  @Mutation(() => CacheClearResponse)
  @UseGuards(PermGuard)
  async clearTournamentApiCache(
    @User() user: Player,
    @Args('eventId', { type: () => ID }) eventId: string,
    @Args('includeChildren', { type: () => Boolean, defaultValue: true }) includeChildren: boolean,
  ): Promise<CacheClearResponse> {
    if (!(await user.hasAnyPermission(['change:job']))) {
      throw new ForbiddenException('Insufficient permissions to clear cache');
    }

    // Try tournament event first, then competition event
    const tournamentEvent = await TournamentEvent.findOne({ where: { id: eventId } });
    const competitionEvent = !tournamentEvent ? await CompetitionEvent.findOne({ where: { id: eventId } }) : null;
    const event = tournamentEvent || competitionEvent;

    if (!event?.visualCode) {
      return { success: false, message: `Event not found or has no visualCode: ${eventId}`, keysRemoved: 0 };
    }

    let keysRemoved: number;
    if (includeChildren) {
      keysRemoved = await this.tournamentApiClient.clearCacheForTournament(event.visualCode);
    } else {
      keysRemoved = await this.tournamentApiClient.clearCacheByPattern(`tournament-api:*/Tournament/${event.visualCode}`);
    }

    this.logger.log(`Cache cleared for event ${event.visualCode} (includeChildren: ${includeChildren}): ${keysRemoved} keys removed`);

    return {
      success: true,
      message: `Cleared ${keysRemoved} cached API entries for ${event.visualCode}`,
      keysRemoved,
    };
  }

  @Mutation(() => CacheClearResponse)
  @UseGuards(PermGuard)
  async clearSubEventApiCache(
    @User() user: Player,
    @Args('subEventId', { type: () => ID }) subEventId: string,
    @Args('includeChildren', { type: () => Boolean, defaultValue: true }) includeChildren: boolean,
  ): Promise<CacheClearResponse> {
    if (!(await user.hasAnyPermission(['change:job']))) {
      throw new ForbiddenException('Insufficient permissions to clear cache');
    }

    // Try tournament sub-event first, then competition sub-event
    const tournamentSubEvent = await TournamentSubEvent.findOne({
      where: { id: subEventId },
      relations: ['tournamentEvent'],
    });
    const competitionSubEvent = !tournamentSubEvent
      ? await CompetitionSubEvent.findOne({
          where: { id: subEventId },
          relations: ['competitionEvent'],
        })
      : null;

    const subEvent = tournamentSubEvent || competitionSubEvent;
    if (!subEvent?.visualCode) {
      return { success: false, message: `Sub-event not found or has no visualCode: ${subEventId}`, keysRemoved: 0 };
    }

    const parentVisualCode = tournamentSubEvent?.tournamentEvent?.visualCode || competitionSubEvent?.competitionEvent?.visualCode;

    if (!parentVisualCode) {
      return { success: false, message: `Parent event not found for sub-event: ${subEventId}`, keysRemoved: 0 };
    }

    const pattern = includeChildren
      ? `tournament-api:*/Tournament/${parentVisualCode}*/Event/${subEvent.visualCode}*`
      : `tournament-api:*/Tournament/${parentVisualCode}*/Event/${subEvent.visualCode}`;

    const keysRemoved = await this.tournamentApiClient.clearCacheByPattern(pattern);
    this.logger.log(`Cache cleared for sub-event ${subEvent.visualCode} (includeChildren: ${includeChildren}): ${keysRemoved} keys removed`);

    return {
      success: true,
      message: `Cleared ${keysRemoved} cached API entries for sub-event ${subEvent.visualCode}`,
      keysRemoved,
    };
  }

  @Mutation(() => CacheClearResponse)
  @UseGuards(PermGuard)
  async clearDrawApiCache(
    @User() user: Player,
    @Args('drawId', { type: () => ID }) drawId: string,
    @Args('includeChildren', { type: () => Boolean, defaultValue: true }) includeChildren: boolean,
  ): Promise<CacheClearResponse> {
    if (!(await user.hasAnyPermission(['change:job']))) {
      throw new ForbiddenException('Insufficient permissions to clear cache');
    }

    // Try tournament draw first, then competition draw
    const tournamentDraw = await TournamentDraw.findOne({ where: { id: drawId } });
    const competitionDraw = !tournamentDraw ? await CompetitionDraw.findOne({ where: { id: drawId } }) : null;

    const draw = tournamentDraw || competitionDraw;
    if (!draw?.visualCode) {
      return { success: false, message: `Draw not found or has no visualCode: ${drawId}`, keysRemoved: 0 };
    }

    const pattern = includeChildren ? `tournament-api:*/Draw/${draw.visualCode}*` : `tournament-api:*/Draw/${draw.visualCode}`;

    const keysRemoved = await this.tournamentApiClient.clearCacheByPattern(pattern);
    this.logger.log(`Cache cleared for draw ${draw.visualCode} (includeChildren: ${includeChildren}): ${keysRemoved} keys removed`);

    return {
      success: true,
      message: `Cleared ${keysRemoved} cached API entries for draw ${draw.visualCode}`,
      keysRemoved,
    };
  }
}
