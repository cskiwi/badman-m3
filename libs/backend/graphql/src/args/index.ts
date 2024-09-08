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

export const ClubArgs = args(Club, 'Club');
export const ClubPlayerMembershipArgs = args(
  ClubPlayerMembership,
  'ClubPlayerMembership',
);
export const EventCompetitionArgs = args(EventCompetition, 'EventCompetition');
export const PlayerArgs = args(Player, 'Player');
export const EventTournamentArgs = args(EventTournament, 'EventTournament');
export const GameArgs = args(Game, 'Game');
export const GamePlayerMembershipArgs = args(
  GamePlayerMembership,
  'GamePlayerMembership',
);
export const RankingGroupArgs = args(RankingGroup, 'RankingGroup');
export const TeamArgs = args(Team, 'Team');
export const RankingLastPlaceArgs = args(RankingLastPlace, 'RankingLastPlace');
export const RankingPlaceArgs = args(RankingPlace, 'RankingPlace');
export const RankingPointArgs = args(RankingPoint, 'RankingPoint');
export const RankingSystemArgs = args(RankingSystem, 'RankingSystem');
export const RankingSystemRankingGroupMembershipArgs = args(
  RankingSystemRankingGroupMembership,
  'RankingSystemRankingGroupMembership',
);
export const SubEventCompetitionArgs = args(
  SubEventCompetition,
  'SubEventCompetition',
);
export const TeamPlayerMembershipArgs = args(
  TeamPlayerMembership,
  'TeamPlayerMembership',
);
