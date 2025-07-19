import { PermGuard, User } from '@app/backend-authorization';
import { LogEntry, Player } from '@app/models';
import { IsUUID } from '@app/utils';
import { ForbiddenException, NotFoundException, UseGuards } from '@nestjs/common';
import { Args, ID, Query, Resolver } from '@nestjs/graphql';
import { LogEntryArgs } from '../../args';

@Resolver(() => LogEntry)
export class LogEntryResolver {
  @Query(() => LogEntry)
  @UseGuards(PermGuard)
  async logEntry(
    @User() user: Player,
    @Args('id', { type: () => ID }) id: string
  ): Promise<LogEntry> {
    if (!(await user.hasAnyPermission(['change:job']))) {
      throw new ForbiddenException('Insufficient permissions to access log entries');
    }
    const logEntry = await LogEntry.findOne({
      where: {
        id,
      },
    });

    if (logEntry) {
      return logEntry;
    }

    throw new NotFoundException(id);
  }

  @Query(() => [LogEntry])
  @UseGuards(PermGuard)
  async logEntries(
    @User() user: Player,
    @Args('args', { type: () => LogEntryArgs, nullable: true })
    inputArgs?: InstanceType<typeof LogEntryArgs>,
  ): Promise<LogEntry[]> {
    if (!(await user.hasAnyPermission(['change:job']))) {
      throw new ForbiddenException('Insufficient permissions to access log entries');
    }
    const args = LogEntryArgs.toFindManyOptions(inputArgs);
    return LogEntry.find(args);
  }
}