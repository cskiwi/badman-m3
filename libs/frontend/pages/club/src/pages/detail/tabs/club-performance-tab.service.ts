import { computed, resource, signal } from '@angular/core';
import { getSeason } from '@app/utils/comp';

export class ClubPerformanceTabService {
  private clubId = signal<string | null>(null);
  private season = signal<number | null>(null);

  private statsResource = resource({
    params: () => ({
      clubId: this.clubId(),
      season: this.season(),
    }),
    loader: async ({ params }) => {
      if (!params.clubId) {
        return null;
      }

      // Mock statistics - replace with actual GraphQL query when available
      return new Promise<{
        totalGames: number;
        wins: number;
        losses: number;
        draws: number;
        winRate: number;
        averageRanking: number;
        seasonsActive: number;
      }>((resolve) => {
        setTimeout(() => {
          resolve({
            totalGames: Math.floor(Math.random() * 200) + 100,
            wins: Math.floor(Math.random() * 120) + 60,
            losses: Math.floor(Math.random() * 80) + 40,
            draws: Math.floor(Math.random() * 20) + 5,
            winRate: Math.round(Math.random() * 40 + 40),
            averageRanking: Math.floor(Math.random() * 50) + 1,
            seasonsActive: Math.floor(Math.random() * 10) + 5,
          });
        }, 500);
      });
    },
  });

  // Public selectors
  stats = computed(() => this.statsResource.value());
  loading = computed(() => this.statsResource.isLoading());
  error = computed(() => this.statsResource.error()?.message || null);

  // Generate available seasons for charts
  private availableSeasons = computed(() => {
    const currentSeason = getSeason();
    return [
      { label: `${currentSeason - 2}`, value: currentSeason - 2 },
      { label: `${currentSeason - 1}`, value: currentSeason - 1 },
      { label: `${currentSeason}`, value: currentSeason },
    ];
  });

  // Chart data computations
  winRateChartData = computed(() => {
    const seasons = this.availableSeasons().map(s => s.label);
    const data = seasons.map(() => Math.round(Math.random() * 40 + 40));

    return {
      labels: seasons,
      datasets: [{
        label: 'Win Rate %',
        data: data,
        borderColor: '#3B82F6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
      }]
    };
  });

  teamComparisonChartData = computed(() => {
    const teamNames = ['Team A', 'Team B', 'Team C', 'Team D', 'Team E', 'Team F'];
    return {
      labels: teamNames,
      datasets: [{
        label: 'Games Won',
        data: teamNames.map(() => Math.floor(Math.random() * 15) + 5),
        backgroundColor: '#10B981',
      }, {
        label: 'Games Lost',
        data: teamNames.map(() => Math.floor(Math.random() * 10) + 2),
        backgroundColor: '#EF4444',
      }]
    };
  });

  gamesDistributionChartData = computed(() => {
    const stats = this.stats();
    const wins = stats?.wins || Math.floor(Math.random() * 50) + 30;
    const losses = stats?.losses || Math.floor(Math.random() * 30) + 15;
    const draws = stats?.draws || Math.floor(Math.random() * 10) + 5;

    return {
      labels: ['Wins', 'Losses', 'Draws'],
      datasets: [{
        data: [wins, losses, draws],
        backgroundColor: ['#10B981', '#EF4444', '#F59E0B'],
        hoverBackgroundColor: ['#059669', '#DC2626', '#D97706']
      }]
    };
  });

  seasonalPerformanceChartData = computed(() => {
    return {
      labels: ['Attack', 'Defense', 'Teamwork', 'Consistency', 'Strategy', 'Endurance'],
      datasets: [{
        label: 'Current Season',
        data: [75, 68, 82, 71, 79, 73],
        borderColor: '#3B82F6',
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
      }, {
        label: 'Previous Season',
        data: [68, 72, 76, 69, 74, 71],
        borderColor: '#10B981',
        backgroundColor: 'rgba(16, 185, 129, 0.2)',
      }]
    };
  });

  setClubId(clubId: string | null) {
    this.clubId.set(clubId);
  }

  setSeason(season: number | null) {
    this.season.set(season);
  }
}
