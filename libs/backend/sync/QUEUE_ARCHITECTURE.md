# Queue Architecture Fix

## Problem
Previously, all processors were using the same `@Processor(SYNC_QUEUE)` decorator, which meant they were all listening to the same queue. This is incorrect according to the NestJS BullMQ documentation.

## Solution
Each processor now has its own dedicated queue:

- `TournamentDiscoveryProcessor` → `TOURNAMENT_DISCOVERY_QUEUE` ('tournament-discovery')
- `CompetitionEventProcessor` → `COMPETITION_EVENT_QUEUE` ('competition-event')  
- `TournamentEventProcessor` → `TOURNAMENT_EVENT_QUEUE` ('tournament-event')
- `TeamMatchingProcessor` → `TEAM_MATCHING_QUEUE` ('team-matching')

## Architecture

### Queue Constants and Arrays
For easy working with queues, several exports are available:

```typescript
// Individual queue names
export const TOURNAMENT_DISCOVERY_QUEUE = 'tournament-discovery';
export const COMPETITION_EVENT_QUEUE = 'competition-event';
export const TOURNAMENT_EVENT_QUEUE = 'tournament-event';
export const TEAM_MATCHING_QUEUE = 'team-matching';
export const SYNC_QUEUE = 'sync'; // Legacy

// Array of all queue names for iteration
export const ALL_SYNC_QUEUES = [
  SYNC_QUEUE,
  TOURNAMENT_DISCOVERY_QUEUE,
  COMPETITION_EVENT_QUEUE,
  TOURNAMENT_EVENT_QUEUE,
  TEAM_MATCHING_QUEUE,
] as const;

// Queue to job type mapping
export const QUEUE_JOB_TYPE_MAP = {
  [TOURNAMENT_DISCOVERY_QUEUE]: [JOB_TYPES.TOURNAMENT_DISCOVERY],
  [COMPETITION_EVENT_QUEUE]: [JOB_TYPES.COMPETITION_STRUCTURE_SYNC, JOB_TYPES.COMPETITION_GAME_SYNC],
  [TOURNAMENT_EVENT_QUEUE]: [JOB_TYPES.TOURNAMENT_STRUCTURE_SYNC, JOB_TYPES.TOURNAMENT_GAME_SYNC],
  [TEAM_MATCHING_QUEUE]: [JOB_TYPES.TEAM_MATCHING],
  [SYNC_QUEUE]: [], // Legacy queue
} as const;
```

### Queue Registration
All queues are registered dynamically in `SyncModule`:
```typescript
// Register all queues dynamically
...ALL_SYNC_QUEUES.map(queueName => 
  BullModule.registerQueue({
    name: queueName,
  })
),
```

### Service Methods
`SyncService` provides helpful methods for working with queues:
```typescript
// Get all queue instances
private getAllQueues(): Queue[]

// Get queue name to instance mapping
getQueueMap(): Record<string, Queue>

// Get individual queue statistics by name
async getQueueStatsByName()

// Get aggregated statistics from all queues
async getQueueStats()
```

### Service Injection
`SyncService` now injects all queues individually:
```typescript
constructor(
  @InjectQueue(TOURNAMENT_DISCOVERY_QUEUE) private readonly tournamentDiscoveryQueue: Queue,
  @InjectQueue(COMPETITION_EVENT_QUEUE) private readonly competitionEventQueue: Queue,
  @InjectQueue(TOURNAMENT_EVENT_QUEUE) private readonly tournamentEventQueue: Queue,
  @InjectQueue(TEAM_MATCHING_QUEUE) private readonly teamMatchingQueue: Queue,
) {}
```

### Job Routing
Jobs are now routed to the appropriate queue based on their type:
- Tournament discovery jobs → `tournamentDiscoveryQueue`
- Competition structure/game sync → `competitionEventQueue`
- Tournament structure/game sync → `tournamentEventQueue`
- Team matching jobs → `teamMatchingQueue`

### Event Listeners
Each queue has its own event listener:
- `SyncEventsListener` (legacy queue)
- `TournamentDiscoveryEventsListener`
- `CompetitionEventEventsListener`
- `TournamentEventEventsListener`
- `TeamMatchingEventsListener`

All listeners extend a shared `BaseQueueEventsListener` class to avoid code duplication.

## Benefits
1. **Proper separation of concerns** - Each processor handles its specific job types
2. **Better resource management** - Jobs can be prioritized and scaled per queue
3. **Improved monitoring** - Easier to track which types of jobs are failing/succeeding
4. **NestJS compliance** - Follows the documented best practices
5. **Scalability** - Different queues can be scaled independently
