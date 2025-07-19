export interface RankingPeriod {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  rankingSystemId: string;
}

export interface RankingPeriodCreate {
  name: string;
  startDate: Date;
  endDate: Date;
  rankingSystemId: string;
  isActive?: boolean;
}

export interface RankingPeriodUpdate {
  name?: string;
  startDate?: Date;
  endDate?: Date;
  isActive?: boolean;
}