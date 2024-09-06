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

export const ClubArgs = args(Club);
export const ClubPlayerMembershipArgs = args(ClubPlayerMembership);
export const EventCompetitionArgs = args(EventCompetition);
export const PlayerArgs = args(Player);
export const EventTournamentArgs = args(EventTournament);
export const GameArgs = args(Game);
export const GamePlayerMembershipArgs = args(GamePlayerMembership);
export const RankingGroupArgs = args(RankingGroup);
export const TeamArgs = args(Team);
export const RankingLastPlaceArgs = args(RankingLastPlace);
export const RankingPlaceArgs = args(RankingPlace);
export const RankingPointArgs = args(RankingPoint);
export const RankingSystemArgs = args(RankingSystem);
export const RankingSystemRankingGroupMembershipArgs = args(
  RankingSystemRankingGroupMembership,
);
export const SubEventCompetitionArgs = args(SubEventCompetition);
export const TeamPlayerMembershipArgs = args(TeamPlayerMembership);
