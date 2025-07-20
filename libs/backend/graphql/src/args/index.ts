import {
  Availability,
  Club,
  ClubPlayerMembership,
  Comment,
  Court,
  CronJob,
  TournamentDraw,
  CompetitionEncounter,
  CompetitionEncounterChange,
  CompetitionEncounterChangeDate,
  Entry,
  CompetitionEvent,
  TournamentEvent,
  Faq,
  Game,
  GamePlayerMembership,
  ImportFile,
  Location,
  LogEntry,
  Notification,
  Player,
  RankingGroup,
  RankingLastPlace,
  RankingPlace,
  RankingPoint,
  RankingSystem,
  RankingSystemRankingGroupMembership,
  RequestLink,
  Rule,
  Service,
  Setting,
  Standing,
  CompetitionSubEvent,
  TournamentSubEvent,
  Team,
  TeamPlayerMembership,
} from '@app/models';

import { args } from '../utils';
import { appendSortableObjects, SortOrderType } from '../utils/sort-order';
import { appendWhereObjects, WhereInputType } from '../utils/where-input';

// Register all SortOrderTypes
SortOrderType(Club, 'Club');
SortOrderType(ClubPlayerMembership, 'ClubPlayerMembership');
SortOrderType(CompetitionEvent, 'CompetitionEvent');
SortOrderType(CompetitionSubEvent, 'CompetitionSubEvent');
SortOrderType(Player, 'Player');
SortOrderType(TournamentEvent, 'TournamentEvent');
SortOrderType(TournamentSubEvent, 'TournamentSubEvent');
SortOrderType(TournamentDraw, 'TournamentDraw');
SortOrderType(Game, 'Game');
SortOrderType(RankingGroup, 'RankingGroup');
SortOrderType(Team, 'Team');
SortOrderType(RankingLastPlace, 'RankingLastPlace');
SortOrderType(RankingPlace, 'RankingPlace');
SortOrderType(RankingPoint, 'RankingPoint');
SortOrderType(RankingSystem, 'RankingSystem');
SortOrderType(RankingSystemRankingGroupMembership, 'RankingSystemRankingGroupMembership');
SortOrderType(TeamPlayerMembership, 'TeamPlayerMembership');
SortOrderType(GamePlayerMembership, 'GamePlayerMembership');
SortOrderType(Comment, 'Comment');
SortOrderType(Faq, 'Faq');
SortOrderType(RequestLink, 'RequestLink');
SortOrderType(Availability, 'Availability');
SortOrderType(Court, 'Court');
SortOrderType(Entry, 'Entry');
SortOrderType(Location, 'Location');
SortOrderType(Standing, 'Standing');
SortOrderType(CompetitionEncounter, 'CompetitionEncounter');
SortOrderType(CompetitionEncounterChange, 'CompetitionEncounterChange');
SortOrderType(CompetitionEncounterChangeDate, 'CompetitionEncounterChangeDate');
SortOrderType(ImportFile, 'ImportFile');
SortOrderType(Notification, 'Notification');
SortOrderType(Setting, 'Setting');
SortOrderType(CronJob, 'CronJob');
SortOrderType(LogEntry, 'LogEntry');
SortOrderType(Rule, 'Rule');
SortOrderType(Service, 'Service');

// Register all WhereInputTypes
WhereInputType(Club, 'Club');
WhereInputType(ClubPlayerMembership, 'ClubPlayerMembership');
WhereInputType(CompetitionEvent, 'CompetitionEvent');
WhereInputType(CompetitionSubEvent, 'CompetitionSubEvent');
WhereInputType(Player, 'Player');
WhereInputType(TournamentEvent, 'TournamentEvent');
WhereInputType(TournamentSubEvent, 'TournamentSubEvent');
WhereInputType(TournamentDraw, 'TournamentDraw');
WhereInputType(Game, 'Game');
WhereInputType(RankingGroup, 'RankingGroup');
WhereInputType(Team, 'Team');
WhereInputType(RankingLastPlace, 'RankingLastPlace');
WhereInputType(RankingPlace, 'RankingPlace');
WhereInputType(RankingPoint, 'RankingPoint');
WhereInputType(RankingSystem, 'RankingSystem');
WhereInputType(RankingSystemRankingGroupMembership, 'RankingSystemRankingGroupMembership');
WhereInputType(TeamPlayerMembership, 'TeamPlayerMembership');
WhereInputType(GamePlayerMembership, 'GamePlayerMembership');
WhereInputType(Comment, 'Comment');
WhereInputType(Faq, 'Faq');
WhereInputType(RequestLink, 'RequestLink');
WhereInputType(Availability, 'Availability');
WhereInputType(Court, 'Court');
WhereInputType(Entry, 'Entry');
WhereInputType(Location, 'Location');
WhereInputType(Standing, 'Standing');
WhereInputType(CompetitionEncounter, 'CompetitionEncounter');
WhereInputType(CompetitionEncounterChange, 'CompetitionEncounterChange');
WhereInputType(CompetitionEncounterChangeDate, 'CompetitionEncounterChangeDate');
WhereInputType(ImportFile, 'ImportFile');
WhereInputType(Notification, 'Notification');
WhereInputType(Setting, 'Setting');
WhereInputType(CronJob, 'CronJob');
WhereInputType(LogEntry, 'LogEntry');
WhereInputType(Rule, 'Rule');
WhereInputType(Service, 'Service');

// Append nested objects to orders
appendSortableObjects(Club, 'Club');
appendSortableObjects(ClubPlayerMembership, 'ClubPlayerMembership');
appendSortableObjects(CompetitionEvent, 'CompetitionEvent');
appendSortableObjects(CompetitionSubEvent, 'CompetitionSubEvent');
appendSortableObjects(Player, 'Player');
appendSortableObjects(Game, 'Game');
appendSortableObjects(GamePlayerMembership, 'GamePlayerMembership');
appendSortableObjects(RankingGroup, 'RankingGroup');
appendSortableObjects(Team, 'Team');
appendSortableObjects(TeamPlayerMembership, 'TeamPlayerMembership');
appendSortableObjects(TournamentEvent, 'TournamentEvent');
appendSortableObjects(TournamentSubEvent, 'TournamentSubEvent');
appendSortableObjects(TournamentDraw, 'TournamentDraw');
appendSortableObjects(RankingLastPlace, 'RankingLastPlace');
appendSortableObjects(RankingPlace, 'RankingPlace');
appendSortableObjects(RankingPoint, 'RankingPoint');
appendSortableObjects(RankingSystem, 'RankingSystem');
appendSortableObjects(RankingSystemRankingGroupMembership, 'RankingSystemRankingGroupMembership');
appendSortableObjects(Comment, 'Comment');
appendSortableObjects(Faq, 'Faq');
appendSortableObjects(RequestLink, 'RequestLink');
appendSortableObjects(Availability, 'Availability');
appendSortableObjects(Court, 'Court');
appendSortableObjects(Entry, 'Entry');
appendSortableObjects(Location, 'Location');
appendSortableObjects(Standing, 'Standing');
appendSortableObjects(CompetitionEncounter, 'CompetitionEncounter');
appendSortableObjects(CompetitionEncounterChange, 'CompetitionEncounterChange');
appendSortableObjects(CompetitionEncounterChangeDate, 'CompetitionEncounterChangeDate');
appendSortableObjects(ImportFile, 'ImportFile');
appendSortableObjects(Notification, 'Notification');
appendSortableObjects(Setting, 'Setting');
appendSortableObjects(CronJob, 'CronJob');
appendSortableObjects(LogEntry, 'LogEntry');
appendSortableObjects(Rule, 'Rule');
appendSortableObjects(Service, 'Service');

// Append nested objects to where inputs
appendWhereObjects(Club, 'Club');
appendWhereObjects(ClubPlayerMembership, 'ClubPlayerMembership');
appendWhereObjects(CompetitionEvent, 'CompetitionEvent');
appendWhereObjects(CompetitionSubEvent, 'CompetitionSubEvent');
appendWhereObjects(Player, 'Player');
appendWhereObjects(Game, 'Game');
appendWhereObjects(GamePlayerMembership, 'GamePlayerMembership');
appendWhereObjects(RankingGroup, 'RankingGroup');
appendWhereObjects(Team, 'Team');
appendWhereObjects(TeamPlayerMembership, 'TeamPlayerMembership');
appendWhereObjects(TournamentEvent, 'TournamentEvent');
appendWhereObjects(TournamentSubEvent, 'TournamentSubEvent');
appendWhereObjects(TournamentDraw, 'TournamentDraw');
appendWhereObjects(RankingLastPlace, 'RankingLastPlace');
appendWhereObjects(RankingPlace, 'RankingPlace');
appendWhereObjects(RankingPoint, 'RankingPoint');
appendWhereObjects(RankingSystem, 'RankingSystem');
appendWhereObjects(RankingSystemRankingGroupMembership, 'RankingSystemRankingGroupMembership');
appendWhereObjects(Comment, 'Comment');
appendWhereObjects(Faq, 'Faq');
appendWhereObjects(RequestLink, 'RequestLink');
appendWhereObjects(Availability, 'Availability');
appendWhereObjects(Court, 'Court');
appendWhereObjects(Entry, 'Entry');
appendWhereObjects(Location, 'Location');
appendWhereObjects(Standing, 'Standing');
appendWhereObjects(CompetitionEncounter, 'CompetitionEncounter');
appendWhereObjects(CompetitionEncounterChange, 'CompetitionEncounterChange');
appendWhereObjects(CompetitionEncounterChangeDate, 'CompetitionEncounterChangeDate');
appendWhereObjects(ImportFile, 'ImportFile');
appendWhereObjects(Notification, 'Notification');
appendWhereObjects(Setting, 'Setting');
appendWhereObjects(CronJob, 'CronJob');
appendWhereObjects(LogEntry, 'LogEntry');
appendWhereObjects(Rule, 'Rule');
appendWhereObjects(Service, 'Service');

export const ClubArgs = args<Club>('Club');
export const ClubPlayerMembershipArgs = args<ClubPlayerMembership>('ClubPlayerMembership');
export const CompetitionEventArgs = args<CompetitionEvent>('CompetitionEvent');
export const CompetitionSubEventArgs = args<CompetitionSubEvent>('CompetitionSubEvent');
export const PlayerArgs = args<Player>('Player');
export const TournamentEventArgs = args<TournamentEvent>('TournamentEvent');
export const TournamentSubEventArgs = args<TournamentSubEvent>('TournamentSubEvent');
export const TournamentDrawArgs = args<TournamentDraw>('TournamentDraw');

export const GameArgs = args<Game>('Game');
export const RankingGroupArgs = args<RankingGroup>('RankingGroup');
export const TeamArgs = args<Team>('Team');
export const RankingLastPlaceArgs = args<RankingLastPlace>('RankingLastPlace');
export const RankingPlaceArgs = args<RankingPlace>('RankingPlace');
export const RankingPointArgs = args<RankingPoint>('RankingPoint');
export const RankingSystemArgs = args<RankingSystem>('RankingSystem');
export const RankingSystemRankingGroupMembershipArgs = args<RankingSystemRankingGroupMembership>('RankingSystemRankingGroupMembership');
export const TeamPlayerMembershipArgs = args<TeamPlayerMembership>('TeamPlayerMembership');
export const GamePlayerMembershipArgs = args<GamePlayerMembership>('GamePlayerMembership');

// New model args
export const CommentArgs = args<Comment>('Comment');
export const FaqArgs = args<Faq>('Faq');
export const RequestLinkArgs = args<RequestLink>('RequestLink');
export const AvailabilityArgs = args<Availability>('Availability');
export const CourtArgs = args<Court>('Court');
export const EntryArgs = args<Entry>('Entry');
export const LocationArgs = args<Location>('Location');
export const StandingArgs = args<Standing>('Standing');
export const CompetitionEncounterArgs = args<CompetitionEncounter>('CompetitionEncounter');
export const CompetitionEncounterChangeArgs = args<CompetitionEncounterChange>('CompetitionEncounterChange');
export const CompetitionEncounterChangeDateArgs = args<CompetitionEncounterChangeDate>('CompetitionEncounterChangeDate');
export const ImportFileArgs = args<ImportFile>('ImportFile');
export const NotificationArgs = args<Notification>('Notification');
export const SettingArgs = args<Setting>('Setting');
export const CronJobArgs = args<CronJob>('CronJob');
export const LogEntryArgs = args<LogEntry>('LogEntry');
export const RuleArgs = args<Rule>('Rule');
export const ServiceArgs = args<Service>('Service');
