# Competition Event Processor Services

This directory contains individual injectable NestJS services that handle different types of competition synchronization tasks. Each service is responsible for a specific aspect of the competition sync process.

## Services Created

### 1. CompetitionStructureSyncService
- **File**: `competition-structure-sync.service.ts`
- **Purpose**: Handles full competition structure synchronization including events, teams, and draws
- **Corresponds to**: `JOB_TYPES.COMPETITION_STRUCTURE_SYNC`

### 2. CompetitionGameSyncService
- **File**: `competition-game-sync.service.ts`
- **Purpose**: Handles competition game/match synchronization
- **Corresponds to**: `JOB_TYPES.COMPETITION_GAME_SYNC`

### 3. CompetitionEventSyncService
- **File**: `competition-event-sync.service.ts`
- **Purpose**: Handles competition event synchronization with optional sub-components
- **Corresponds to**: `'competition-event-sync'`

### 4. CompetitionSubEventSyncService
- **File**: `competition-subevent-sync.service.ts`
- **Purpose**: Handles competition sub-event synchronization including draws
- **Corresponds to**: `'competition-subevent-sync'`

### 5. CompetitionDrawSyncService
- **File**: `competition-draw-sync.service.ts`
- **Purpose**: Handles competition draw synchronization and entry management
- **Corresponds to**: `'competition-draw-sync'`

### 6. CompetitionEntrySyncService
- **File**: `competition-entry-sync.service.ts`
- **Purpose**: Handles team entry synchronization for draws
- **Corresponds to**: `'competition-entry-sync'`

### 7. CompetitionEncounterSyncService
- **File**: `competition-encounter-sync.service.ts`
- **Purpose**: Handles competition encounter/match synchronization
- **Corresponds to**: `'competition-encounter-sync'`

### 8. CompetitionStandingSyncService
- **File**: `competition-standing-sync.service.ts`
- **Purpose**: Handles competition standing calculations (local calculation from game results)
- **Corresponds to**: `'competition-standing-sync'`

### 9. CompetitionGameIndividualSyncService
- **File**: `competition-game-individual-sync.service.ts`
- **Purpose**: Handles individual competition game synchronization
- **Corresponds to**: `'competition-game-sync'` (the individual case)

## Usage

The main `CompetitionEventProcessor` has been updated to inject all these services and delegate the processing logic to the appropriate service based on the job type in the switch case.

Each service:
- Is properly decorated with `@Injectable()`
- Has proper TypeScript typing
- Includes comprehensive error handling and logging
- Follows the existing patterns from the original processor
- Supports progress tracking where applicable
- Is exported through the `index.ts` file for easy importing

## Benefits

1. **Separation of Concerns**: Each service handles a specific type of sync operation
2. **Testability**: Individual services can be unit tested independently
3. **Reusability**: Services can be injected and used in other parts of the application
4. **Maintainability**: Easier to modify individual sync operations without affecting others
5. **Type Safety**: Proper TypeScript interfaces for each service's data requirements

## Integration

The services are integrated into the main processor by:
1. Importing all services in the processor
2. Injecting them in the constructor
3. Updating the switch case to call the appropriate service method
4. Maintaining the existing job progress tracking and error handling patterns
