# Tournament Sync Implementation Plan

## Overview

This document outlines the implementation plan for syncing tournaments and competitions from Tournament Software API (https://api.tournamentsoftware.com/) into the badman system.

## Data Source Configuration

- **API Base URL**: `https://api.tournamentsoftware.com/`
- **Authentication**: Basic Auth (configured via environment variables)
  - `TOURNAMENT_API_USERNAME`: Tournament Software API username
  - `TOURNAMENT_API_PASSWORD`: Tournament Software API password
  - **Note**: Credentials must be stored in `.env` file, never hardcoded

## Architecture Overview

### Service Separation Strategy

The tournament sync functionality is implemented as a **separate standalone service** to ensure:

- **Performance Isolation**: Sync operations don't impact main API performance
- **Scalability**: Worker service can be scaled independently
- **Reliability**: Main application remains available during heavy sync operations
- **Resource Management**: Dedicated resources for background processing
- **Deployment Flexibility**: Can be deployed on different infrastructure

### Queue-Based Processing

Using NestJS Queue system with Bull/BullMQ for handling different sync operations:

```
Tournament Sync Worker
├── Sync Schedulers (Cron Jobs)
├── Queue Processors
│   ├── Tournament Discovery Processor
│   ├── Tournament Event Processor
│   ├── Competition Event Processor
│   ├── Game Sync Processor
│   └── Team Matching Processor
├── Sync Services
└── Admin Interface
```

### Architecture Structure

```
apps/tournament-sync-worker/               # Standalone Worker Service
├── src/
│   ├── app/
│   │   ├── app.module.ts                 # Main module with Redis/Queue config
│   │   ├── app.controller.ts             # Health/status endpoints
│   │   └── app.service.ts                # Worker service logic
│   └── main.ts                           # Worker startup
├── Dockerfile                            # Docker configuration
└── project.json                          # Nx build config

libs/backend/
├── tournament-api/                       # Shared API Client
│   ├── src/
│   │   ├── client/tournament-api.client.ts
│   │   ├── types/tournament.types.ts
│   │   └── tournament-api.module.ts
│   └── project.json
└── tournament-sync/                      # Sync Logic (Shared)
    ├── src/
    │   ├── processors/                   # Queue processors
    │   ├── services/                     # Sync services
    │   ├── queues/                       # Queue definitions
    │   └── tournament-sync.module.ts
    └── project.json

libs/frontend/pages/
└── tournament-sync-admin/                # Admin Interface
    ├── src/
    │   ├── dashboard/
    │   ├── team-matching/
    │   └── lib.routes.ts
    └── project.json
```

## Implementation Steps

### Phase 1: Core Infrastructure

#### 1.1 Generate Backend Libraries and Worker Service
```bash
# Shared libraries
nx g @nx/nest:library libs/backend/tournament-api --buildable
nx g @nx/nest:library backend/tournament-sync --buildable

# Standalone worker service
nx g @nx/nest:application tournament-sync-worker

# Frontend admin interface
nx g @nx/angular:library libs/frontend/pages/tournament-sync-admin --routing
```

#### 1.2 Tournament API Client
- HTTP client for Tournament Software API
- Type definitions for API responses
- Authentication middleware
- Rate limiting and error handling

#### 1.3 Queue Infrastructure
- Configure Bull/BullMQ queues
- Define job types and payloads
- Set up Redis connection

### Phase 2: Sync Processors

#### 2.1 Tournament Discovery Processor
- **Job**: `tournament-discovery`
- **Schedule**: Daily check
- **Endpoint**: `GET /1.0/Tournament?list=1&refdate=2014-01-01`
- **Logic**: Add only new tournaments, don't update existing

#### 2.2 Competition Event Processor (TypeID = 1)
- **Target**: Team Tournaments (Belgian Interclub competitions)
- **Jobs**: 
  - `competition-structure-sync` (events, draws, team matches)
  - `competition-game-sync`
- **Schedule**: 
  - Structure: May 1 - August 31 only (2x daily at 8AM and 8PM)
  - Games: Every 4 hours after played, then daily for 1 week, then weekly for 1 month
- **Endpoints**: Use team-specific endpoints for matches and results

#### 2.3 Tournament Event Processor (TypeID = 0)
- **Target**: Individual Tournaments 
- **Jobs**:
  - `tournament-structure-sync` (events, draws, entries)
  - `tournament-game-sync`
- **Schedule**:
  - Structure: 2x daily until event start (12 hours apart)
  - Games: Hourly until event end midnight, then daily for 1 week, then weekly for 1 month
- **Endpoints**: Use individual match endpoints for games and results

#### 2.4 Team Matching Processor
- **Job**: `team-matching`
- **Logic**: 
  - Fuzzy matching algorithm for team names
  - Multiple criteria matching (name variations, club associations)
  - Queue unmatched teams for admin review

### Phase 3: Data Models & Sync Logic

#### 3.1 Sync Entities
```typescript
// Tournament Software mapping tables
- TournamentSoftwareEvent
- TournamentSoftwareSubEvent  
- TournamentSoftwareDraw
- TournamentSoftwareGame
- TournamentSoftwareTeam

// Sync tracking
- SyncJob
- SyncLog
- TeamMatchingQueue
```

#### 3.2 Merge Strategy
- **Partial Updates Only**: Preserve local data, only update fields from API
- **Conflict Resolution**: Local data takes precedence
- **Change Detection**: Compare timestamps and checksums

### Phase 4: Admin Interface

#### 4.1 Generate Frontend Pages
```bash
nx g @nx/angular:library frontend/pages/tournament-sync --routing
```

#### 4.2 Competition Management Pages
- Competition list with sync status
- Competition detail with recursive sync options
- Game management and manual sync triggers

#### 4.3 Tournament Management Pages
- Tournament list with sync status  
- Tournament detail with structure visualization
- Real-time sync monitoring

#### 4.4 Team Matching Interface
- Unmatched teams queue
- Manual team association tools
- Fuzzy matching suggestions
- Event-level team management

#### 4.5 Sync Dashboard
- Overall sync health monitoring
- Job queue status
- Error logs and retry mechanisms
- Manual sync triggers at all levels

### Phase 5: Sync Scheduling

#### 5.1 Cron Job Configuration
```typescript
// Daily discovery
@Cron('0 6 * * *') // 6 AM daily
async discoverNewTournaments()

// Competition structure (May-August only)
@Cron('0 */12 * 5-8 *') // Every 12 hours, May-August
async syncCompetitionStructure()

// Tournament structure (until event start)
@Cron('0 */12 * * *') // Every 12 hours
async syncTournamentStructure()

// Game syncing (dynamic based on event dates)
// Implemented via dynamic job scheduling
```

#### 5.2 Dynamic Job Scheduling
- Calculate sync intervals based on event dates
- Adjust frequency based on event type and status
- Automatic cleanup of completed sync jobs

## Technical Considerations

### Queue Configuration
- **Concurrency**: Limit concurrent jobs to prevent API rate limiting
- **Retry Logic**: Exponential backoff for failed jobs
- **Job Priorities**: Tournament games > Competition games > Structure updates

### Data Integrity
- **Transaction Management**: Ensure atomic updates
- **Rollback Capability**: Ability to revert problematic syncs
- **Audit Trail**: Complete logging of all sync operations

### Performance Optimization
- **Incremental Sync**: Only process changed data
- **Batch Processing**: Group related updates
- **Caching**: Cache API responses to reduce external calls

### Error Handling
- **Dead Letter Queue**: Handle persistently failing jobs
- **Notification System**: Alert admins of critical sync failures
- **Manual Intervention**: Admin tools to resolve sync conflicts

## API Integration Strategy

### Available Endpoints (Based on Tournament Software API Documentation)

#### Core Tournament Endpoints
1. **Tournament Discovery**: `GET /1.0/Tournament?list=1&refdate=YYYY-MM-DD&pagesize=100`
2. **Tournament Search**: `GET /1.0/Tournament?q={searchterm}&pagesize=100`
3. **Tournament Details**: `GET /1.0/Tournament/{tournamentCode}`

#### Tournament Structure Endpoints
4. **Event List**: `GET /1.0/Tournament/{tournamentCode}/Event/{eventCode}`
5. **Stage List**: `GET /1.0/Tournament/{tournamentCode}/Stages`
6. **Event Entries**: `GET /1.0/Tournament/{tournamentCode}/Event/{eventCode}/Entry`
7. **Event Draws**: `GET /1.0/Tournament/{tournamentCode}/Event/{eventCode}/Draw/{drawCode}`
8. **Draw List**: `GET /1.0/Tournament/{tournamentCode}/Draw/{drawCode}`

#### Team & Club Endpoints
9. **Team List**: `GET /1.0/Tournament/{tournamentCode}/Team/{teamCode}`
10. **Club List**: `GET /1.0/Tournament/{tournamentCode}/Club/{clubCode}`
11. **Club Teams**: `GET /1.0/Tournament/{tournamentCode}/Club/{clubCode}/Team`
12. **Event Teams**: `GET /1.0/Tournament/{tournamentCode}/Event/{eventCode}/Team/{teamCode}`

#### Match/Game Endpoints
13. **Matches by Date**: `GET /1.0/Tournament/{tournamentCode}/Match/{date}`
14. **Matches by Draw**: `GET /1.0/Tournament/{tournamentCode}/Draw/{drawCode}/Match`
15. **Team Matches**: `GET /1.0/Tournament/{tournamentCode}/TeamMatch/{matchCode}`
16. **Match Details**: `GET /1.0/Tournament/{tournamentCode}/MatchDetail/{matchCode}`
17. **Match Date**: `GET /1.0/Tournament/{tournamentCode}/Match/{matchID}/Date`

#### League Endpoints (For Competition Support)
18. **Leagues**: `GET /1.0/Leagues/{organizationCode}`
19. **League Results**: `GET /1.0/LeagueResults/{leagueCode}`

#### Player Endpoints
20. **Player List**: `GET /1.0/Tournament/{tournamentCode}/Player/{memberID}`

### Tournament Types & Competition Logic
- **TypeID 0**: Individual Tournament (tournaments)
- **TypeID 1**: Team Tournament (competitions/interclub)
- **TypeID 2**: Team Sport Tournament
- **TypeID 3**: Online League

### Authentication & Rate Limiting
- **Authentication**: Basic Auth with provided credentials
- **Response Format**: XML only
- **Rate Limiting**: TBD (mentioned in docs but not specified)
- **Pagination**: Default 100, max 1000 items per page

### Key Data Structures (XML Response Format)

#### Tournament List Response
```xml
<Result Version="1.0">
  <Tournament>
    <Code>088C218F-681B-48F0-8589-1EB777EDB770</Code>
    <Name>Tournament Name</Name>
    <CountryCode>BEL</CountryCode>
    <TypeID>0</TypeID> <!-- 0=Individual, 1=Team -->
    <LastUpdated>2025-07-26T06:18:16.623</LastUpdated>
    <StartDate>2025-09-06T00:00:00</StartDate>
    <EndDate>2025-09-07T23:59:59</EndDate>
    <Livescore>false</Livescore>
  </Tournament>
</Result>
```

#### Tournament Details Response
```xml
<Result Version="1.0">
  <Tournament>
    <Code>GUID</Code>
    <Name>Tournament Name</Name>
    <HistoricCode>Historical Code</HistoricCode>
    <TypeID>0</TypeID>
    <TournamentStatus>0</TournamentStatus>
    <LastUpdated>DateTime</LastUpdated>
    <StartDate>DateTime</StartDate>
    <EndDate>DateTime</EndDate>
    <Livescore>boolean</Livescore>
    <OnlineEntryStartDate>DateTime</OnlineEntryStartDate>
    <OnlineEntryEndDate>DateTime</OnlineEntryEndDate>
    <TournamentTimezone>Integer</TournamentTimezone>
    <PrizeMoney>Integer</PrizeMoney>
    <Category>
      <Code>GUID</Code>
      <Name>Category Name</Name>
    </Category>
    <Organization>
      <ID>GUID</ID>
      <Name>Organization Name</Name>
    </Organization>
    <Contact>
      <Name>Contact Name</Name>
      <Phone>Phone Number</Phone>
      <Email>Email Address</Email>
    </Contact>
    <Venue>
      <Name>Venue Name</Name>
      <Address>Address</Address>
      <PostalCode>Postal Code</PostalCode>
      <City>City</City>
      <CountryCode>Country Code</CountryCode>
      <Phone>Phone</Phone>
      <Website>Website URL</Website>
    </Venue>
  </Tournament>
</Result>
```

#### Tournament Status Codes
- **0**: Unknown
- **101**: Tournament Finished
- **199**: Tournament Cancelled
- **198**: Tournament Postponed
- **201**: League New
- **202**: League Entry open
- **203**: League Publicly visible
- **204**: League Finished

## Security Considerations
- Store API credentials in environment variables
- Encrypt sensitive sync data
- Implement audit logging for all sync operations
- Role-based access for sync administration

## Testing Strategy
- Unit tests for each processor
- Integration tests with mock API responses
- End-to-end testing of sync workflows
- Performance testing under load

## Deployment Considerations

### Environment Configuration
Create `.env` file with required variables:
```bash
# Tournament Software API
TOURNAMENT_API_USERNAME=your_username
TOURNAMENT_API_PASSWORD=your_password

# Redis (for Bull queues)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Worker Service
TOURNAMENT_SYNC_WORKER_PORT=3000
```

### Quick Start

1. **Set up environment variables** (copy `.env.example` to `.env`):
   ```bash
   cp .env.example .env
   ```

2. **Configure your Tournament Software API credentials** in `.env`:
   ```bash
   TOURNAMENT_API_USERNAME=your_username
   TOURNAMENT_API_PASSWORD=your_password
   ```

3. **Start required services** (Redis for queues):
   ```bash
   docker-compose up -d redis
   ```

4. **Start the worker service**:
   ```bash
   # Development mode (with hot reload)
   nx serve tournament-sync-worker

   # Production mode
   nx build tournament-sync-worker
   node dist/tournament-sync-worker/main.js
   ```

5. **Verify the service is running**:
   - Health check: `GET http://localhost:3000/api/health`
   - Service status: `GET http://localhost:3000/api/status`

### Development Tools
```bash
# Start Redis Commander for queue monitoring (optional)
docker-compose --profile development up -d redis-commander
# Access at http://localhost:8081
```

### Production Deployment

#### Required Services
```bash
# Start Redis for queue management
docker-compose up -d redis
```

#### Application Deployment
```bash
# Build the worker application
nx build tournament-sync-worker

# Start the worker service
node dist/tournament-sync-worker/main.js
```

#### Production Considerations
- **Redis**: Required for Bull queue management and persistence
- **Environment Variables**: Configure API credentials and Redis connection
- **Health Checks**: Use `/api/health` endpoint for container orchestration
- **Monitoring**: Monitor queue stats via `/api/status` endpoint
- **Scaling**: Worker service can be scaled horizontally
- **Database**: Sync operations require database access for tournament data

## Future Enhancements
- Real-time sync via webhooks (if API supports)
- Machine learning for team matching
- Predictive sync scheduling
- Advanced conflict resolution workflows