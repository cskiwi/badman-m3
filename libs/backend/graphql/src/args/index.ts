import {
  Club,
  ClubPlayerMembership,
  DrawTournament,
  EventCompetition,
  EventTournament,
  Game,
  GamePlayerMembership,
  Player,
  RankingGroup,
  RankingLastPlace,
  RankingPlace,
  RankingPoint,
  RankingSystem,
  RankingSystemRankingGroupMembership,
  SubEventCompetition,
  SubEventTournament,
  Team,
  TeamPlayerMembership,
} from '@app/models';
import { args } from '../utils';
import { appendSortableObjects, SortOrderType } from '../utils/sort-order';

// Register all SortOrderTypes
SortOrderType(Club, 'Club');
SortOrderType(ClubPlayerMembership, 'ClubPlayerMembership');
SortOrderType(EventCompetition, 'EventCompetition');
SortOrderType(SubEventCompetition, 'SubEventCompetition');
SortOrderType(Player, 'Player');
SortOrderType(EventTournament, 'EventTournament');
SortOrderType(SubEventTournament, 'SubEventTournament');
SortOrderType(DrawTournament, 'DrawTournament');
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

// Append nested objects to orders
appendSortableObjects(Club, 'Club');
appendSortableObjects(ClubPlayerMembership, 'ClubPlayerMembership');
appendSortableObjects(EventCompetition, 'EventCompetition');
appendSortableObjects(SubEventCompetition, 'SubEventCompetition');
appendSortableObjects(Player, 'Player');
appendSortableObjects(Game, 'Game');
appendSortableObjects(GamePlayerMembership, 'GamePlayerMembership');
appendSortableObjects(RankingGroup, 'RankingGroup');
appendSortableObjects(Team, 'Team');
appendSortableObjects(TeamPlayerMembership, 'TeamPlayerMembership');
appendSortableObjects(EventTournament, 'EventTournament');
appendSortableObjects(SubEventTournament, 'SubEventTournament');
appendSortableObjects(DrawTournament, 'DrawTournament');
appendSortableObjects(RankingLastPlace, 'RankingLastPlace');
appendSortableObjects(RankingPlace, 'RankingPlace');
appendSortableObjects(RankingPoint, 'RankingPoint');
appendSortableObjects(RankingSystem, 'RankingSystem');
appendSortableObjects(RankingSystemRankingGroupMembership, 'RankingSystemRankingGroupMembership');

export const ClubArgs = args<Club>('Club'); 
export const ClubPlayerMembershipArgs = args<ClubPlayerMembership>('ClubPlayerMembership');
export const EventCompetitionArgs = args<EventCompetition>('EventCompetition');
export const SubEventCompetitionArgs = args<SubEventCompetition>('SubEventCompetition');
export const PlayerArgs = args<Player>('Player');
export const EventTournamentArgs = args<EventTournament>('EventTournament');
export const SubEventTournamentArgs = args<SubEventTournament>('SubEventTournament');
export const DrawTournamentArgs = args<DrawTournament>('DrawTournament');

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
