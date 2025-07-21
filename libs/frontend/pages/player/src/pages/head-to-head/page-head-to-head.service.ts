import { HttpErrorResponse } from '@angular/common/http';
import { computed, inject, resource } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup } from '@angular/forms';
import { ClubPlayerMembership, GamePlayerMembership, Player } from '@app/models';
import { getSeason, startOfSeason } from '@app/utils/comp';
import { Apollo, gql } from 'apollo-angular';
import moment from 'moment';
import { lastValueFrom } from 'rxjs';

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
  
    private getLastSeasonStartDate(): Date {
      const currentSeason = getSeason();
      const lastSeason = currentSeason - 1;
      return startOfSeason(lastSeason).toDate();
    }
  
    filter = new FormGroup({
      playerId: new FormControl<string | null>(null),
      date: new FormControl<Date | null>(this.getLastSeasonStartDate()),
      minGames: new FormControl<number>(0),
      linkType: new FormControl<'tournament' | 'competition' | null>(null),
      gameType: new FormControl<'D' | 'MX' | 'S' | null>(null),
      partnerClub: new FormControl<string | null>(null),
      opponentClub: new FormControl<string | null>(null),
      viewMode: new FormControl<'partners' | 'opponents'>('partners'),
      partnerFilter: new FormControl<string | null>(null),
    });
  
    // Convert form to signal for resource
    private filterSignal = toSignal(this.filter.valueChanges);
  
  
    private gamePlayerResource = resource({
      params: this.filterSignal,
      loader: ({ params, abortSignal }) => {
        if (!params.playerId || !moment(params.date).isValid()) {
          return Promise.resolve(null);
        }
        return lastValueFrom(this.apollo
          .query<{ player: Player }>({
            query: PLAYER_QUERY,
            variables: {
              id: params.playerId,
              args: {
                take: null,
                where: {
                  game: {
                    linkType: { eq: params.linkType },
                    gameType: { eq: params.gameType },
                    playedAt: { gte: params.date },
                  },
                },
              },
            },
            context: { signal: abortSignal },
          }))
          .then((result) => {
            if (!result?.data?.player) {
              throw new Error('No player found');
            }
            return result.data.player;
          })
          .catch((err) => {
            this.handleError(err);
            throw err;
          });
      },
    });
  
    // Public selectors
    player = computed(() => this.gamePlayerResource.value() ?? null);
    memberships = computed(() => this.player()?.gamePlayerMemberships ?? []);
    loading = computed(() => this.gamePlayerResource.isLoading());
    error = computed(() => this.gamePlayerResource.error()?.message || null);
  
    // Partner club options (clubs of players you played WITH)
    partnerClubOptions = computed(() => {
      const clubs = new Map<string, { value: string; label: string }>();
      this.memberships()?.forEach((membership) => {
        membership.game.gamePlayerMemberships
          ?.filter((gpm) => gpm.team === membership.team && gpm.player !== membership.player)
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
  
    // Opponent club options (clubs of players you played AGAINST)
    opponentClubOptions = computed(() => {
      const clubs = new Map<string, { value: string; label: string }>();
      this.memberships()?.forEach((membership) => {
        membership.game.gamePlayerMemberships
          ?.filter((gpm) => gpm.team !== membership.team)
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
  
    // Partner options computed from memberships (for filtering opponents by partner)
    partnerOptions = computed(() => {
      const partners = new Map<string, { value: string; label: string }>();
      this.memberships()?.forEach((membership) => {
        membership.game.gamePlayerMemberships
          ?.filter((gpm) => gpm.team === membership.team && gpm.player !== membership.player)
          .forEach((gpm) => {
            if (gpm.gamePlayer && !partners.has(gpm.gamePlayer.id)) {
              partners.set(gpm.gamePlayer.id, {
                value: gpm.gamePlayer.id,
                label: gpm.gamePlayer.fullName,
              });
            }
          });
      });
      return Array.from(partners.values());
    });
  
    // Partners/Opponents computation with club and partner filtering
    data = computed(() => {
      const memberships = this.memberships();
      const minGames = this.filter.get('minGames')?.value ?? 0;
      const selectedPartnerClub = this.filter.get('partnerClub')?.value;
      const selectedOpponentClub = this.filter.get('opponentClub')?.value;
      const viewMode = this.filter.get('viewMode')?.value ?? 'partners';
      const selectedPartner = this.filter.get('partnerFilter')?.value;
  
      if (!memberships || memberships.length === 0) return [];
  
      const playerStats = new Map<
        string,
        {
          player: Player;
          winRate: number;
          amountOfGames: number;
          club?: { id: string; name: string };
          partner?: Player; // Store the partner for opponent mode
          partnerClub?: { id: string; name: string }; // Store partner's club
        }
      >();
  
      if (viewMode === 'partners') {
        // Partners mode: track individual partners (other than the current player)
        memberships.forEach((membership: GamePlayerMembership) => {
          // Find all teammates (including self)
          const teamMemberships = membership.game.gamePlayerMemberships.filter(
            (m: GamePlayerMembership) => m.team === membership.team
          );

          // For each teammate that is NOT the current player, treat as a partner
          teamMemberships.forEach((m: GamePlayerMembership) => {
            if (m.player === membership.player) return; // skip self
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
              playerStats.set(playerId, {
                player: m.gamePlayer,
                winRate: 0,
                amountOfGames: 0,
              });
            }

            const stats = playerStats.get(playerId);
            if (!stats) return;

            stats.amountOfGames += 1;
            const isWin = membership.game.winner == m.team;

            stats.winRate = Math.round((((stats.winRate / 100) * (stats.amountOfGames - 1) + (isWin ? 1 : 0)) / stats.amountOfGames) * 100 * 100) / 100;
            stats.club = club;
          });
        });
      } else {
        // Opponents mode: track opponent teams, not individual players
        const processedGames = new Set<string>();
  
        memberships.forEach((membership: GamePlayerMembership) => {
          // If viewing opponents with a specific partner, filter games to only include those with that partner
          if (selectedPartner) {
            const hasSelectedPartner = membership.game.gamePlayerMemberships.some(
              (gpm: GamePlayerMembership) => gpm.team === membership.team && gpm.player !== membership.player && gpm.gamePlayer.id === selectedPartner,
            );
            if (!hasSelectedPartner) return;
          }
  
          // Skip if we've already processed this game
          if (processedGames.has(membership.game.id)) return;
          processedGames.add(membership.game.id);
  
          // Get opponent team members
          const opponentMemberships = membership.game.gamePlayerMemberships.filter((m: GamePlayerMembership) => m.team !== membership.team);
  
          if (opponentMemberships.length === 0) return;
  
          // Create a unique key for this opponent team (sorted player IDs)
          const opponentTeamKey = opponentMemberships
            .map((m) => m.gamePlayer.id)
            .sort()
            .join('-');
  
          // Use the first opponent as the representative (could be either player)
          const representativeOpponent = opponentMemberships[0];
  
          // Find active club of the representative
          let club: { id: string; name: string } | undefined = undefined;
          const clubMemberships = representativeOpponent.gamePlayer?.clubPlayerMemberships;
          if (Array.isArray(clubMemberships)) {
            const found = clubMemberships.find((cm: ClubPlayerMembership) => cm.active && cm.club && cm.club.id);
            if (found && found.club) {
              club = { id: found.club.id, name: found.club.name };
            }
          }
  
          if (!playerStats.has(opponentTeamKey)) {
            playerStats.set(opponentTeamKey, {
              player: representativeOpponent.gamePlayer,
              winRate: 0,
              amountOfGames: 0,
            });
          }
  
          const stats = playerStats.get(opponentTeamKey);
          if (!stats) return;
  
          stats.amountOfGames += 1;
          const isWin = membership.game.winner == membership.team;
  
          stats.winRate = Math.round((((stats.winRate / 100) * (stats.amountOfGames - 1) + (isWin ? 1 : 0)) / stats.amountOfGames) * 100 * 100) / 100;
          stats.club = club;
  
          // Track their partner (the other player on the opponent team)
          if (!stats.partner && opponentMemberships.length > 1) {
            const partnerOpponent = opponentMemberships.find((m) => m.gamePlayer.id !== representativeOpponent.gamePlayer.id);
            if (partnerOpponent) {
              stats.partner = partnerOpponent.gamePlayer;
  
              // Find partner's active club
              const partnerClubMemberships = partnerOpponent.gamePlayer?.clubPlayerMemberships;
              if (Array.isArray(partnerClubMemberships)) {
                const foundPartnerClub = partnerClubMemberships.find((cm: ClubPlayerMembership) => cm.active && cm.club && cm.club.id);
                if (foundPartnerClub && foundPartnerClub.club) {
                  stats.partnerClub = { id: foundPartnerClub.club.id, name: foundPartnerClub.club.name };
                }
              }
            }
          }
        });
      }
  
      return Array.from(playerStats.values())
        .map((stats) => ({
          player: stats.player,
          winRate: stats.winRate,
          amountOfGames: stats.amountOfGames,
          club: stats.club,
          partner: viewMode === 'opponents' ? stats.partner : undefined,
          partnerClub: viewMode === 'opponents' ? stats.partnerClub : undefined,
        }))
        .filter((p) => p.amountOfGames >= minGames)
        .filter((p) => {
          // Filter by partner (for partners mode)
          if (viewMode === 'partners' && selectedPartner) {
            return p.player && String(p.player.id) === String(selectedPartner);
          }
          // Filter by partner club (for partners mode)
          if (viewMode === 'partners' && selectedPartnerClub) {
            return p.club && String(p.club.id) === String(selectedPartnerClub);
          }
          // Filter by opponent club (for opponents mode)
          if (viewMode === 'opponents' && selectedOpponentClub) {
            return p.club && String(p.club.id) === String(selectedOpponentClub);
          }
          return true;
        });
    });
  
    private handleError(err: HttpErrorResponse) {
      if (err.status === 404 && err.url) {
        throw new Error('Failed to load player');
      }
      throw new Error(err.statusText);
    }
}
