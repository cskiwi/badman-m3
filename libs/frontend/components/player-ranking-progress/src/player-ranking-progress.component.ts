import { ChangeDetectionStrategy, Component, computed, inject, input, resource } from '@angular/core';
import { Player, RankingLastPlace, RankingSystem } from '@app/models';
import { RankingSystemService } from '@app/frontend-modules-graphql/ranking';
import { TranslateModule } from '@ngx-translate/core';
import { Apollo, gql } from 'apollo-angular';
import { lastValueFrom } from 'rxjs';

type DisciplineKey = 'single' | 'double' | 'mix';

interface DisciplineProgress {
  key: DisciplineKey;
  labelKey: string;
  level: number | null | undefined;
  points: number | null | undefined;
  downPoints: number | null | undefined;
  upgradeThreshold: number | null;
  downgradeThreshold: number | null;
  pointsToUpgrade: number | null;
  pointsBeforeDowngrade: number | null;
  /** Which direction the player is closer to (or only side that exists). */
  nearer: 'upgrade' | 'downgrade' | null;
  atTop: boolean;
  atFloor: boolean;
}

@Component({
  selector: 'app-player-ranking-progress',
  imports: [TranslateModule],
  templateUrl: './player-ranking-progress.component.html',
  styleUrl: './player-ranking-progress.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayerRankingProgressComponent {
  private readonly apollo = inject(Apollo);
  private readonly rankingSystemService = inject(RankingSystemService);

  /** Player to load ranking progress for. */
  playerId = input.required<string | null | undefined>();

  /**
   * Optional override for the ranking system. When omitted, falls back to
   * the active `RankingSystemService.systemId()`.
   */
  systemId = input<string | null | undefined>(undefined);

  private readonly resolvedSystemId = computed(
    () => this.systemId() ?? this.rankingSystemService.systemId() ?? null,
  );

  private readonly rankingResource = resource({
    params: () => ({
      playerId: this.playerId() ?? null,
      systemId: this.resolvedSystemId(),
    }),
    loader: async ({ params, abortSignal }) => {
      if (!params.playerId || !params.systemId) {
        return null;
      }

      try {
        const result = await lastValueFrom(
          this.apollo.query<{ player: Player }>({
            query: gql`
              query PlayerRankingProgress($id: ID!, $args: RankingLastPlaceArgs) {
                player(id: $id) {
                  id
                  rankingLastPlaces(args: $args) {
                    id
                    single
                    singlePoints
                    singlePointsDowngrade
                    double
                    doublePoints
                    doublePointsDowngrade
                    mix
                    mixPoints
                    mixPointsDowngrade
                    systemId
                  }
                }
              }
            `,
            variables: {
              id: params.playerId,
              args: { where: { systemId: { eq: params.systemId } } },
            },
            context: { signal: abortSignal },
          }),
        );

        return result?.data?.player?.rankingLastPlaces?.[0] ?? null;
      } catch {
        return null;
      }
    },
  });

  rankingPlace = computed<RankingLastPlace | null>(() => this.rankingResource.value() ?? null);
  system = computed<RankingSystem | null>(() => this.rankingSystemService.system() ?? null);

  /** Whether there is enough data to render the strip. */
  visible = computed(() => !!this.playerId() && !!this.rankingPlace() && !!this.system());

  /**
   * Per-discipline progress combining the player's `RankingLastPlace` with the
   * matching row in `RankingSystem.pointsToGoUp` / `pointsToGoDown`.
   */
  disciplines = computed<DisciplineProgress[]>(() => {
    const rp = this.rankingPlace();
    const sys = this.system();
    if (!rp || !sys) return [];

    const tableRows = this.buildSystemTable(sys);
    const rowFor = (level: number | null | undefined) =>
      level == null ? null : (tableRows.find((r) => r.level === level) ?? null);

    const buildEntry = (key: DisciplineKey, labelKey: string): DisciplineProgress => {
      const level = rp[key] as number | null | undefined;
      const points = rp[`${key}Points` as 'singlePoints' | 'doublePoints' | 'mixPoints'] as
        | number
        | null
        | undefined;
      const downPoints = rp[
        `${key}PointsDowngrade` as 'singlePointsDowngrade' | 'doublePointsDowngrade' | 'mixPointsDowngrade'
      ] as number | null | undefined;
      const row = rowFor(level);

      const upgradeThreshold = row?.pointsToGoUp ?? null;
      const downgradeThreshold = row?.pointsToGoDown ?? null;

      const pointsToUpgrade =
        upgradeThreshold !== null && points !== null && points !== undefined
          ? Math.max(0, upgradeThreshold - points + 1)
          : null;
      const pointsBeforeDowngrade =
        downgradeThreshold !== null && downPoints !== null && downPoints !== undefined
          ? downPoints - downgradeThreshold
          : null;

      // Decide which side is "nearer" — i.e. show only the most relevant
      // distance for the player. If only one side has data, pick that one;
      // otherwise the smaller absolute distance wins.
      let nearer: 'upgrade' | 'downgrade' | null = null;
      if (pointsToUpgrade !== null && pointsBeforeDowngrade !== null) {
        nearer = pointsToUpgrade <= pointsBeforeDowngrade ? 'upgrade' : 'downgrade';
      } else if (pointsToUpgrade !== null) {
        nearer = 'upgrade';
      } else if (pointsBeforeDowngrade !== null) {
        nearer = 'downgrade';
      }

      return {
        key,
        labelKey,
        level,
        points,
        downPoints,
        upgradeThreshold,
        downgradeThreshold,
        pointsToUpgrade,
        pointsBeforeDowngrade,
        nearer,
        atTop: upgradeThreshold === null,
        atFloor: downgradeThreshold === null,
      };
    };

    return [
      buildEntry('single', 'all.ranking.edit.single'),
      buildEntry('double', 'all.ranking.edit.double'),
      buildEntry('mix', 'all.ranking.edit.mix'),
    ];
  });

  private buildSystemTable(sys: RankingSystem) {
    let level = sys.amountOfLevels ?? 0;
    return (
      sys.pointsWhenWinningAgainst?.map((winning: number, index: number) => ({
        level: level--,
        pointsToGoUp: level !== 0 ? Math.round(sys.pointsToGoUp?.[index] ?? 0) : null,
        pointsToGoDown: index === 0 ? null : Math.round(sys.pointsToGoDown?.[index - 1] ?? 0),
        pointsWhenWinningAgainst: Math.round(winning),
      })) ?? []
    );
  }
}
