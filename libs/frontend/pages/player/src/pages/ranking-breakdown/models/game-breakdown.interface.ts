import { Game, GamePlayerMembership } from '@app/models';
import { GameBreakdownType } from '@app/utils/comp';

export interface GameBreakdown extends Game {
  points?: number;
  type: GameBreakdownType;
  dropsNextPeriod?: boolean;
  team: (GamePlayerMembership | undefined)[];
  opponent: (GamePlayerMembership | undefined)[];

  // Upgrade calculations
  totalPointsUpgrade?: number;
  avgUpgrade?: number;
  highestAvgUpgrade?: boolean;
  canUpgrade?: boolean;
  usedForUpgrade?: boolean;
  countUpgrade?: number;
  devideUpgrade?: number;
  devideUpgradeCorrected?: number;

  // LatestXGamesToUse cutoff tracking
  outOfScopeLatestXUpgrade?: boolean;
  outOfScopeLatestXDowngrade?: boolean;

  // Downgrade calculations
  totalPointsDowngrade?: number;
  avgDowngrade?: number;
  highestAvgDowngrade?: boolean;
  canDowngrade?: boolean;
  usedForDowngrade?: boolean;
  countDowngrade?: number;
  devideDowngrade?: number;
  devideDowngradeCorrected?: number;
}
