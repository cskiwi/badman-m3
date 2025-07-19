import { Player } from '@app/models';

export type PlayerGrid = {
  player: Player;
  winRate: number;
  amountOfGames: number;
  club?: { id: string; name: string };
  partner?: Player; // For opponent mode: the partner this opponent played with
  partnerClub?: { id: string; name: string }; // For opponent mode: the partner's club
};
