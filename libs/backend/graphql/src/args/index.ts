import {
  Availability,
  Club,
  ClubPlayerMembership,
  Comment,
  Court,
  CronJob,
  TournamentDraw,
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
SortOrderType(CompetitionEncounterChange, 'CompetitionEncounterChange');
SortOrderType(CompetitionEncounterChangeDate, 'CompetitionEncounterChangeDate');
SortOrderType(ImportFile, 'ImportFile');
SortOrderType(Notification, 'Notification');
SortOrderType(Setting, 'Setting');
SortOrderType(CronJob, 'CronJob');
SortOrderType(LogEntry, 'LogEntry');
SortOrderType(Rule, 'Rule');
SortOrderType(Service, 'Service');

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
appendSortableObjects(CompetitionEncounterChange, 'CompetitionEncounterChange');
appendSortableObjects(CompetitionEncounterChangeDate, 'CompetitionEncounterChangeDate');
appendSortableObjects(ImportFile, 'ImportFile');
appendSortableObjects(Notification, 'Notification');
appendSortableObjects(Setting, 'Setting');
appendSortableObjects(CronJob, 'CronJob');
appendSortableObjects(LogEntry, 'LogEntry');
appendSortableObjects(Rule, 'Rule');
appendSortableObjects(Service, 'Service');

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
export const CompetitionEncounterChangeArgs = args<CompetitionEncounterChange>('CompetitionEncounterChange');
export const CompetitionEncounterChangeDateArgs = args<CompetitionEncounterChangeDate>('CompetitionEncounterChangeDate');
export const ImportFileArgs = args<ImportFile>('ImportFile');
export const NotificationArgs = args<Notification>('Notification');
export const SettingArgs = args<Setting>('Setting');
export const CronJobArgs = args<CronJob>('CronJob');
export const LogEntryArgs = args<LogEntry>('LogEntry');
export const RuleArgs = args<Rule>('Rule');
export const ServiceArgs = args<Service>('Service');
