import {
  Club,
  ClubPlayerMembership,
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
  Team,
  TeamPlayerMembership,
} from '@app/models';
import { args } from '../utils';
import { appendSortableObjects, SortOrderType } from '../utils/sort-order';

// Register all SortOrderTypes
SortOrderType(Club, 'Club');
SortOrderType(ClubPlayerMembership, 'ClubPlayerMembership');
SortOrderType(EventCompetition, 'EventCompetition');
SortOrderType(Player, 'Player');
SortOrderType(EventTournament, 'EventTournament');
SortOrderType(Game, 'Game');
SortOrderType(RankingGroup, 'RankingGroup');
SortOrderType(Team, 'Team');
SortOrderType(RankingLastPlace, 'RankingLastPlace');
SortOrderType(RankingPlace, 'RankingPlace');
SortOrderType(RankingPoint, 'RankingPoint');
SortOrderType(RankingSystem, 'RankingSystem');
SortOrderType(RankingSystemRankingGroupMembership, 'RankingSystemRankingGroupMembership');
SortOrderType(SubEventCompetition, 'SubEventCompetition');
SortOrderType(TeamPlayerMembership, 'TeamPlayerMembership');
SortOrderType(GamePlayerMembership, 'GamePlayerMembership');

// Append nested objects to orders
appendSortableObjects(Club, 'Club');
appendSortableObjects(ClubPlayerMembership, 'ClubPlayerMembership');
appendSortableObjects(EventCompetition, 'EventCompetition');
appendSortableObjects(Player, 'Player');
appendSortableObjects(EventTournament, 'EventTournament');
appendSortableObjects(Game, 'Game'); 
appendSortableObjects(RankingGroup, 'RankingGroup');
appendSortableObjects(Team, 'Team');
appendSortableObjects(RankingLastPlace, 'RankingLastPlace');
appendSortableObjects(RankingPlace, 'RankingPlace');
appendSortableObjects(RankingPoint, 'RankingPoint');
appendSortableObjects(RankingSystem, 'RankingSystem');
appendSortableObjects(RankingSystemRankingGroupMembership, 'RankingSystemRankingGroupMembership');
appendSortableObjects(SubEventCompetition, 'SubEventCompetition');
appendSortableObjects(TeamPlayerMembership, 'TeamPlayerMembership');
appendSortableObjects(GamePlayerMembership, 'GamePlayerMembership');

export const ClubArgs = args<Club>('Club');
export const ClubPlayerMembershipArgs = args<ClubPlayerMembership>('ClubPlayerMembership');
export const EventCompetitionArgs = args<EventCompetition>('EventCompetition');
export const PlayerArgs = args<Player>('Player');
export const EventTournamentArgs = args<EventTournament>('EventTournament');
export const GameArgs = args<Game>('Game');
export const RankingGroupArgs = args<RankingGroup>('RankingGroup');
export const TeamArgs = args<Team>('Team');
export const RankingLastPlaceArgs = args<RankingLastPlace>('RankingLastPlace');
export const RankingPlaceArgs = args<RankingPlace>('RankingPlace');
export const RankingPointArgs = args<RankingPoint>('RankingPoint');
export const RankingSystemArgs = args<RankingSystem>('RankingSystem');
export const RankingSystemRankingGroupMembershipArgs = args<RankingSystemRankingGroupMembership>('RankingSystemRankingGroupMembership');
export const SubEventCompetitionArgs = args<SubEventCompetition>('SubEventCompetition');
export const TeamPlayerMembershipArgs = args<TeamPlayerMembership>('TeamPlayerMembership');
export const GamePlayerMembershipArgs = args<GamePlayerMembership>('GamePlayerMembership');
