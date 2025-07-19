import { LogEntry } from '@app/models';
import { IsUUID } from '@app/utils';
import { NotFoundException } from '@nestjs/common';
import { Args, ID, Query, Resolver } from '@nestjs/graphql';
import { LogEntryArgs } from '../../args';

@Resolver(() => LogEntry)
export class LogEntryResolver {
  @Query(() => LogEntry)
  async logEntry(@Args('id', { type: () => ID }) id: string): Promise<LogEntry> {
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
  async logEntries(
    @Args('args', { type: () => LogEntryArgs, nullable: true })
    inputArgs?: InstanceType<typeof LogEntryArgs>,
  ): Promise<LogEntry[]> {
    const args = LogEntryArgs.toFindManyOptions(inputArgs);
    return LogEntry.find(args);
  }
}