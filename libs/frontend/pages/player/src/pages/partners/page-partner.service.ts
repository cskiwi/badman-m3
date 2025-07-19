import { HttpErrorResponse } from '@angular/common/http';
import { computed, inject, resource } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup } from '@angular/forms';
import { ClubPlayerMembership, GamePlayerMembership, Player } from '@app/models';
import { Apollo, gql } from 'apollo-angular';
import moment from 'moment';

const PLAYER_QUERY = gql`
  query Player($id: ID!, $args: GamePlayerMembershipArgs, $clubPlayerMembershipsArgs: ClubPlayerMembershipArgs) {
    player(id: $id) {
      id
      fullName
      memberId
      slug
      gamePlayerMemberships(args: $args) {
        id
        team
        player
        game {
          id
          gameType
          playedAt
          winner
          gamePlayerMemberships {
            id
            team
            player
            gamePlayer {
              id
              fullName
              clubPlayerMemberships(args: $clubPlayerMembershipsArgs) {
                id
                active
                club {
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

export class DetailService {
  private readonly apollo = inject(Apollo);

  filter = new FormGroup({
    playerId: new FormControl<string | null>(null),
    date: new FormControl<Date | null>(moment().subtract(1, 'year').toDate()),
    minGames: new FormControl<number>(0),
    linkType: new FormControl<'tournament' | 'competition' | null>(null),
    gameType: new FormControl<'D' | 'X' | null>(null),
    club: new FormControl<string | null>(null),
  });

  // Convert form to signal for resource
  private filterSignal = toSignal(this.filter.valueChanges);

  private gamePlayerMembershipsResource = resource({
    params: this.filterSignal,
    loader: ({ params, abortSignal }) => {
      if (!params.playerId || !moment(params.date).isValid()) {
        return Promise.resolve([]);
      }

      return this.apollo
        .query<{ player: Player }>({
          query: PLAYER_QUERY,
          variables: {
            id: params.playerId,
            args: {
              take: null,
              where: {
                game: {
                  linkType: params.linkType,
                  gameType: params.gameType == null ? { $ne: 'S' } : params.gameType,
                  playedAt: { $gte: params.date },
                },
              },
            },
          },
          context: { signal: abortSignal },
        })
        .toPromise()
        .then((result) => {
          if (!result?.data?.player) {
            throw new Error('No player found');
          }
          return result.data.player.gamePlayerMemberships;
        })
        .catch((err) => {
          this.handleError(err);
          throw err;
        });
    },
  });

  // Public selectors
  memberships = computed(() => this.gamePlayerMembershipsResource.value() ?? []);
  loading = computed(() => this.gamePlayerMembershipsResource.isLoading());
  error = computed(() => this.gamePlayerMembershipsResource.error()?.message || null);

  // Club options computed from memberships
  clubOptions = computed(() => {
    const clubs = new Map<string, { value: string; label: string }>();
    this.memberships()?.forEach((membership) => {
      membership.game.gamePlayerMemberships
        ?.filter((gpm) => gpm.team === membership.team)
        .forEach((gpm) => {
          gpm.gamePlayer?.clubPlayerMemberships?.forEach((cpm) => {
            if (cpm.active && cpm.club && cpm.club.id && cpm.club.name && !clubs.has(cpm.club.id)) {
              clubs.set(cpm.club.id, {
                value: cpm.club.id,
                label: cpm.club.name,
              });
            }
          });
        });
    });
    return Array.from(clubs.values());
  });

  // Partners computation with club filtering moved here
  partners = computed(() => {
    const memberships = this.memberships();
    const minGames = this.filter.get('minGames')?.value ?? 0;
    const selectedClub = this.filter.get('club')?.value;

    if (!memberships || memberships.length === 0) return [];

    const playerStats = new Map<
      string,
      {
        player: Player;
        winRate: number;
        amountOfGames: number;
        club?: { id: string; name: string };
      }
    >();

    memberships.forEach((membership: GamePlayerMembership) => {
      membership.game.gamePlayerMemberships
        .filter((m: GamePlayerMembership) => m.team === membership.team && m.player !== membership.player)
        .forEach((m: GamePlayerMembership) => {
          const playerId = m.gamePlayer.id;

          // Find active club
          let club: { id: string; name: string } | undefined = undefined;
          const clubMemberships = m.gamePlayer?.clubPlayerMemberships;
          if (Array.isArray(clubMemberships)) {
            const found = clubMemberships.find((cm: ClubPlayerMembership) => cm.active && cm.club && cm.club.id);
            if (found && found.club) {
              club = { id: found.club.id, name: found.club.name };
            }
          }

          if (!playerStats.has(playerId)) {
            playerStats.set(playerId, { player: m.gamePlayer, winRate: 0, amountOfGames: 0 });
          }

          const stats = playerStats.get(playerId);
          if (!stats) return;

          stats.amountOfGames += 1;
          stats.winRate =
            Math.round(
              (((stats.winRate / 100) * (stats.amountOfGames - 1) + (membership.game.winner == m.team ? 1 : 0)) / stats.amountOfGames) * 100 * 100,
            ) / 100;
          stats.club = club;
        });
    });

    return Array.from(playerStats.values())
      .filter((p) => p.amountOfGames >= minGames)
      .filter((p) => {
        if (!selectedClub) return true;
        return p.club && String(p.club.id) === String(selectedClub);
      });
  });

  private handleError(err: HttpErrorResponse) {
    if (err.status === 404 && err.url) {
      throw new Error('Failed to load player');
    }
    throw new Error(err.statusText);
  }
}
