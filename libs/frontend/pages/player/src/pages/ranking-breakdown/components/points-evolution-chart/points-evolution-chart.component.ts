import { isPlatformBrowser } from '@angular/common';
import { effect, Component, computed, inject, input, PLATFORM_ID, resource, signal } from '@angular/core';
import { RankingPlace, RankingSystem } from '@app/models';
import { Apollo, gql } from 'apollo-angular';
import { ChartModule } from 'primeng/chart';
import { AccordionModule } from 'primeng/accordion';
import { SkeletonModule } from 'primeng/skeleton';
import dayjs from 'dayjs';
import { lastValueFrom } from 'rxjs';
import { RankingType } from '../../page-ranking-breakdown.service';
import { ButtonModule } from 'primeng/button';
import { ChartConfiguration } from 'chart.js';

const RANKING_HISTORY_QUERY = gql`
  query RankingPointsHistory($playerId: ID!, $args: RankingPlaceArgs) {
    player(id: $playerId) {
      id
      rankingPlaces(args: $args) {
        id
        rankingDate
        singlePoints
        doublePoints
        mixPoints
        singlePointsDowngrade
        doublePointsDowngrade
        mixPointsDowngrade
        single
        double
        mix
      }
    }
  }
`;

@Component({
  selector: 'app-points-evolution-chart',
  templateUrl: './points-evolution-chart.component.html',
  imports: [ChartModule, AccordionModule, SkeletonModule, ButtonModule],
})
export class PointsEvolutionChartComponent {
  private readonly apollo = inject(Apollo);
  readonly chartHeight = signal(300);

  playerId = input.required<string>();
  system = input.required<RankingSystem>();
  type = input.required<RankingType>();

  constructor() {
    // console.log("Am I called on SSR?", this.system());

    effect(() => {
      console.log('Player ID or system changed, current values:', this.playerId(), this.system());
    });
  }

  private historyResource = resource({
    params: () => {
      const playerId = this.playerId();
      const system = this.system();

      console.log('Calculating resource params with playerId', playerId, 'and system', system);

      if (!playerId || !system?.id) return null;
      return { playerId, systemId: system.id };
    },
    loader: async ({ params, abortSignal }) => {
      if (!params) return [];

      const result = await lastValueFrom(
        this.apollo.query<{ player: { rankingPlaces: RankingPlace[] } }>({
          query: RANKING_HISTORY_QUERY,
          variables: {
            playerId: params.playerId,
            args: {
              where: [{ systemId: { eq: params.systemId } }],
              order: { rankingDate: 'ASC' },
            },
          },
          context: { signal: abortSignal },
        }),
      );

      return result?.data?.player?.rankingPlaces ?? [];
    },
  });

  loading = computed(() => this.historyResource.isLoading());
  rankingHistory = computed(() => this.historyResource.value() ?? []);

  chartData = computed(() => {
    const history = this.rankingHistory();
    const type = this.type();
    if (history.length === 0) return null;

    const upgradeKey = `${type}Points` as keyof RankingPlace;
    const downgradeKey = `${type}PointsDowngrade` as keyof RankingPlace;
    const levelKey = type as keyof RankingPlace;

    return {
      labels: history.map((p) => dayjs(p.rankingDate).format('MMM YYYY')),
      datasets: [
        {
          label: 'Upgrade points',
          data: history.map((p) => (p[upgradeKey] as number | undefined) ?? null),
          borderColor: 'rgba(34, 197, 94, 1)',
          backgroundColor: 'rgba(34, 197, 94, 0.12)',
          fill: true,
          tension: 0.2,
          pointRadius: 2,
          pointHoverRadius: 5,
          borderWidth: 2,
          spanGaps: true,
          yAxisID: 'y',
        },
        {
          label: 'Downgrade points',
          data: history.map((p) => (p[downgradeKey] as number | undefined) ?? null),
          borderColor: 'rgba(249, 115, 22, 1)',
          backgroundColor: 'rgba(249, 115, 22, 0.08)',
          fill: true,
          tension: 0.2,
          pointRadius: 2,
          pointHoverRadius: 5,
          borderWidth: 2,
          spanGaps: true,
          yAxisID: 'y',
        },
        {
          label: 'Level',
          data: history.map((p) => (p[levelKey] as number | undefined) ?? null),
          borderColor: 'rgba(99, 102, 241, 1)',
          backgroundColor: 'rgba(99, 102, 241, 0)',
          fill: false,
          tension: 0,
          pointRadius: 0,
          pointHoverRadius: 4,
          borderWidth: 2,
          borderDash: [4, 4],
          spanGaps: true,
          stepped: 'middle' as const,
          yAxisID: 'y1',
        },
      ],
    };
  });

  chartOptions = computed(
    () =>
      ({
        responsive: true,
        // maintainAspectRatio: false,
        plugins: {
          legend: { display: true, position: 'top' as const },
          tooltip: { mode: 'index' as const, intersect: false },
        },
        scales: {
          y: {
            beginAtZero: true,
            title: { display: true, text: 'Points' },
            grid: { color: 'rgba(128,128,128,0.12)' },
            position: 'left' as const,
          },
          y1: {
            min: 1,
            max: this.system()?.amountOfLevels ?? undefined,
            reverse: true,
            title: { display: true, text: 'Level' },
            grid: { display: false },
            position: 'right' as const,
            ticks: { stepSize: 1 },
          },
          x: { grid: { display: false } },
        },
      }) as ChartConfiguration['options'],
  );
}
