import { computed, inject, Injectable, resource, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup } from '@angular/forms';
import { Game, Player } from '@app/models';
import { GameStatus, GameType } from '@app/models-enum';
import { Apollo, gql } from 'apollo-angular';
import { Dayjs } from 'dayjs';
import { lastValueFrom, startWith } from 'rxjs';

export type RankingType = 'single' | 'double' | 'mix';

const PLAYER_GAMES_QUERY = gql`
  query PlayerGames($playerId: ID!, $args: GamePlayerMembershipArgs, $rankingLastPlacesArgs: RankingLastPlaceArgs) {
    player(id: $playerId) {
      id
      fullName
      rankingLastPlaces(args: $rankingLastPlacesArgs) {
        id
        single
        double
        mix
      }
      gamePlayerMemberships(args: $args) {
        id
        team
        player
        game {
          id
          playedAt
          winner
          status
          gameType
          set1Team1
          set1Team2
          set2Team1
          set2Team2
          set3Team1
          set3Team2
          gamePlayerMemberships {
            id
            team
            player
            single
            double
            mix
            gamePlayer {
              id
              fullName
            }
          }
          rankingPoints {
            id
            differenceInLevel
            playerId
            systemId
            points
          }
          tournamentDraw {
            name
            id
            tournamentSubEvent {
              id
              name
              tournamentEvent {
                id
                name
              }
            }
          }
          competitionEncounter {
            id
            homeTeam {
              id
              name
              abbreviation
            }
            awayTeam {
              id
              name
              abbreviation
            }
            drawCompetition {
              id
              name
              competitionSubEvent {
                id
                name
                competitionEvent {
                  id
                  name
                }
              }
            }
          }
        }
      }
    }
  }
`;

@Injectable()
export class RankingBreakdownService {
  private readonly apollo = inject(Apollo);

  // Shared view toggles
  showUpgrade = signal(true);
  showDowngrade = signal(false);

  filter = new FormGroup({
    systemId: new FormControl<string | null>(null),
    playerId: new FormControl<string | null>(null),
    gameType: new FormControl<RankingType | null>(null),
    start: new FormControl<Dayjs | null>(null),
    end: new FormControl<Dayjs | null>(null),
    game: new FormControl<Dayjs | null>(null),
    next: new FormControl<Dayjs | null>(null),
    includedIgnored: new FormControl<boolean>(false),
    includedUpgrade: new FormControl<boolean>(true),
    includedDowngrade: new FormControl<boolean>(true),
    includeOutOfScopeUpgrade: new FormControl<boolean>(false),
    includeOutOfScopeDowngrade: new FormControl<boolean>(false),
    includeOutOfScopeWonGames: new FormControl<boolean>(false),
    includeOutOfScopeLatestX: new FormControl<boolean>(false),
  });

  private filterSignal = toSignal(this.filter.valueChanges.pipe(startWith(this.filter.value)));

  private gamesResource = resource({
    params: () => this.filterSignal(),
    loader: async ({ params, abortSignal }) => {
      if (!params?.playerId || !params?.systemId || !params?.gameType || !params?.game || !params?.end) {
        return [];
      }

      let gameType = GameType.S;
      switch (params.gameType) {
        case 'single':
          gameType = GameType.S;
          break;
        case 'double':
          gameType = GameType.D;
          break;
        case 'mix':
          gameType = GameType.MX;
          break;
      }

      const result = await lastValueFrom(
        this.apollo.query<{ player: Player }>({
          query: PLAYER_GAMES_QUERY,
          fetchPolicy: 'no-cache',
          variables: {
            playerId: params.playerId,
            args: {
              where: [
                {
                  game: {
                    AND: [
                      { gameType: { eq: gameType } },
                      { status: { in: [GameStatus.NORMAL, GameStatus.RETIREMENT, GameStatus.DISQUALIFIED] } },
                      { playedAt: { between: [params.game.toDate(), params.end.toDate()] } },
                      {
                        OR: [{ set1Team1: { gte: 0 } }, { set1Team2: { gte: 0 } }],
                      },
                      {
                        rankingPoints: { points: { gte: 0 } },
                      },
                    ],
                  },
                },
              ],
            },
            rankingLastPlacesArgs: {
              where: [
                {
                  system: {
                    primary: {
                      eq: true,
                    },
                  },
                },
              ],
            },
          },
          context: { signal: abortSignal },
        }),
      );

      return result?.data?.player?.gamePlayerMemberships?.map((gpm) => gpm.game) ?? [];
    },
  });

  // Public selectors
  games = computed(() => (this.gamesResource.value() ?? []) as Game[]);
  loading = computed(() => this.gamesResource.isLoading());
  error = computed(() => this.gamesResource.error()?.message || null);
}
