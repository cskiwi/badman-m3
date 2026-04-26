import { HttpErrorResponse } from '@angular/common/http';
import { computed, inject, resource } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup } from '@angular/forms';
import { Player, TeamPlayerMembership } from '@app/models';
import { getSeason } from '@app/utils/comp';
import { Apollo, gql } from 'apollo-angular';
import { lastValueFrom } from 'rxjs';

const PLAYER_TEAMS_QUERY = gql`
  query PlayerTeams($playerId: ID!, $args: TeamPlayerMembershipArgs) {
    player(id: $playerId) {
      id
      teamPlayerMemberships(args: $args) {
        id
        membershipType
        team {
          id
          name
          abbreviation
          slug
          type
          season
          teamNumber
          club {
            id
            slug
            name
          }
        }
      }
    }
  }
`;

export class PlayerTeamsService {
  private readonly apollo = inject(Apollo);

  filter = new FormGroup({
    playerId: new FormControl<string | null>(null),
  });

  private filterSignal = toSignal(this.filter.valueChanges);

  private teamsResource = resource({
    params: this.filterSignal,
    loader: async ({ params, abortSignal }) => {
      if (!params.playerId) {
        return [] as TeamPlayerMembership[];
      }

      try {
        const result = await lastValueFrom(
          this.apollo.query<{ player: Player }>({
            query: PLAYER_TEAMS_QUERY,
            variables: {
              playerId: params.playerId,
              args: {
                take: 25,
                where: {
                  team: { season: { eq: getSeason() } },
                },
              },
            },
            context: { signal: abortSignal },
          }),
        );

        return (result?.data?.player?.teamPlayerMemberships ?? []) as TeamPlayerMembership[];
      } catch (err) {
        throw new Error(this.handleError(err as HttpErrorResponse));
      }
    },
  });

  loading = computed(() => this.teamsResource.isLoading());
  memberships = computed(() => this.teamsResource.value() ?? []);

  private handleError(err: HttpErrorResponse): string {
    if (err.status === 404) return 'Failed to load teams';
    return err.statusText || 'An error occurred';
  }
}
