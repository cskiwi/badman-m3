import { HttpErrorResponse } from '@angular/common/http';
import { computed, inject, resource, signal } from '@angular/core';
import { Player, Team, TeamPlayerMembership } from '@app/models';
import { Apollo, gql } from 'apollo-angular';
import { lastValueFrom } from 'rxjs';
import { sortTeams } from '@app/utils/sorts';

export class ClubPlayersTabService {
  private readonly apollo = inject(Apollo);

  private clubId = signal<string | null>(null);
  private season = signal<number | null>(null);

  private teamsResource = resource({
    params: () => ({
      clubId: this.clubId(),
      season: this.season(),
    }),
    loader: async ({ params, abortSignal }) => {
      if (!params.clubId || !params.season) {
        return [];
      }

      try {
        const result = await lastValueFrom(
          this.apollo.query<{ club: { teams: Team[] } }>({
            query: gql`
              query ClubTeamsForPlayers($clubId: ID!, $season: Float!) {
                club(id: $clubId) {
                  id
                  teams(args: { where: [{ season: { eq: $season } }], take: 50, order: { name: ASC } }) {
                    id
                    name
                    abbreviation
                    teamPlayerMemberships {
                      id
                      player {
                        id
                        slug
                        fullName
                        firstName
                        lastName
                      }
                    }
                  }
                }
              }
            `,
            variables: {
              clubId: params.clubId,
              season: params.season,
            },
            context: { signal: abortSignal },
          }),
        );

        return [...(result.data?.club?.teams || [])].sort(sortTeams);
      } catch (err) {
        console.error(err);
        throw new Error(this.handleError(err as HttpErrorResponse));
      }
    },
  });

  // Deduplicated players - each player appears once with all their teamPlayerMemberships populated
  players = computed((): Player[] => {
    const teams = this.teamsResource.value() || [];
    const playersMap = new Map<string, Player>();

    teams.forEach(team => {
      team.teamPlayerMemberships?.forEach(membership => {
        if (membership.player) {
          const playerId = membership.player.id;
          if (!playersMap.has(playerId)) {
            playersMap.set(playerId, { ...membership.player, teamPlayerMemberships: [] } as unknown as Player);
          }
          const entry = playersMap.get(playerId)!;
          entry.teamPlayerMemberships = [...(entry.teamPlayerMemberships ?? []), { ...membership, team } as TeamPlayerMembership];
        }
      });
    });

    return [...playersMap.values()].sort((a, b) =>
      (a.fullName || '').localeCompare(b.fullName || ''),
    );
  });

  // Available teams for the filter bar
  availableTeams = computed((): Team[] => this.teamsResource.value() || []);

  loading = computed(() => this.teamsResource.isLoading());
  error = computed(() => this.teamsResource.error()?.message || null);

  setClubId(clubId: string | null) {
    this.clubId.set(clubId);
  }

  setSeason(season: number | null) {
    this.season.set(season);
  }

  private handleError(err: HttpErrorResponse): string {
    if (err.status === 404 && err.url) {
      return 'Failed to load players';
    }
    return err.statusText || 'An error occurred';
  }
}

