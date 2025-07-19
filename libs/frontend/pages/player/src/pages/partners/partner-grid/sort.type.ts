import { Player } from '@app/models';

export type PlayerGrid = {
  player: Player;
  winRate: number;
  amountOfGames: number;
  club?: { id: string; name: string };
};
