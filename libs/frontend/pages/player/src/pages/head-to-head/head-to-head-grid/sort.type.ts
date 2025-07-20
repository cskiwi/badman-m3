import { Player } from '@app/models';

export type HeadToHeadGrid = {
  player: Player;
  winRate: number;
  amountOfGames: number;
  club?: { id: string; name: string };
  headToHead?: Player; // For opponent mode: the head-to-head this opponent played with
  headToHeadClub?: { id: string; name: string }; // For opponent mode: the head-to-head's club
};
