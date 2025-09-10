import { HttpErrorResponse } from '@angular/common/http';
import { computed, inject, resource } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup } from '@angular/forms';
import { TournamentEvent, TournamentSubEvent, TournamentDraw, Entry, Game } from '@app/models';
import { Apollo, gql } from 'apollo-angular';
import { lastValueFrom } from 'rxjs';

export class DrawDetailService {
  private readonly apollo = inject(Apollo);

  filter = new FormGroup({
    tournamentId: new FormControl<string | null>(null),
    subEventId: new FormControl<string | null>(null),
    drawId: new FormControl<string | null>(null),
  });

  // Convert form to signal for resource
  private filterSignal = toSignal(this.filter.valueChanges);

  private dataResource = resource({
    params: this.filterSignal,
    loader: async ({ params, abortSignal }) => {
      if (!params.tournamentId || !params.subEventId || !params.drawId) {
        return null;
      }

      try {
        const result = await lastValueFrom(
          this.apollo.query<{ 
            tournamentEvent: TournamentEvent; 
            tournamentSubEvent: TournamentSubEvent; 
            tournamentDraw: TournamentDraw & { entries: Entry[]; games: Game[] };
          }>({
            query: gql`
              query TournamentDrawDetail($tournamentId: ID!, $subEventId: ID!, $drawId: ID!) {
                tournamentEvent(id: $tournamentId) {
                  id
                  name
                  slug
                  tournamentNumber
                  visualCode
                }
                tournamentSubEvent(id: $subEventId) {
                  id
                  name
                  eventType
                  gameType
                  level
                  visualCode
                }
                tournamentDraw(id: $drawId) {
                  id
                  name
                  type
                  size
                  visualCode
                  entries {
                    id
                    player1Id
                    player2Id
                    teamId
                    player1 {
                      id
                      firstName
                      lastName
                      fullName
                    }
                    player2 {
                      id
                      firstName
                      lastName
                      fullName
                    }
                    standing {
                      id
                      position
                      played
                      won
                      lost
                      gamesWon
                      gamesLost
                      setsWon
                      setsLost
                      points
                    }
                  }
                  games {
                    id
                    playedAt
                    gameType
                    status
                    set1Team1
                    set1Team2
                    set2Team1
                    set2Team2
                    set3Team1
                    set3Team2
                    winner
                    order
                    round
                    visualCode
                    gamePlayerMemberships {
                      id
                      team
                      gamePlayer {
                        id
                        firstName
                        lastName
                        fullName
                      }
                    }
                  }
                }
              }
            `,
            variables: {
              tournamentId: params.tournamentId,
              subEventId: params.subEventId,
              drawId: params.drawId,
            },
            context: { signal: abortSignal },
          }),
        );

        if (!result?.data.tournamentEvent || !result?.data.tournamentSubEvent || !result?.data.tournamentDraw) {
          throw new Error('No tournament, sub event, or draw found');
        }

        // Flatten standings from entries
        const standings = result.data.tournamentDraw.entries
          ?.flatMap(entry => 
            entry.standing ? [{
              ...entry.standing,
              player1Id: entry.player1Id,
              player2Id: entry.player2Id,
              teamId: entry.teamId,
              player1: entry.player1,
              player2: entry.player2,
            }] : []
          )
          .sort((a, b) => a.position - b.position) || [];

        // Sort games chronologically by playedAt, then by order
        const games = [...(result.data.tournamentDraw.games || [])]
          .sort((a, b) => {
            if (a.playedAt && b.playedAt) {
              return new Date(a.playedAt).getTime() - new Date(b.playedAt).getTime();
            }
            if (a.playedAt && !b.playedAt) return -1;
            if (!a.playedAt && b.playedAt) return 1;
            return (a.order || 0) - (b.order || 0);
          });

        return {
          tournament: result.data.tournamentEvent,
          subEvent: result.data.tournamentSubEvent,
          draw: result.data.tournamentDraw,
          standings,
          games,
        };
      } catch (err) {
        console.log(err);
        throw new Error(this.handleError(err as HttpErrorResponse));
      }
    },
  });

  // Public selectors
  tournament = computed(() => this.dataResource.value()?.tournament);
  subEvent = computed(() => this.dataResource.value()?.subEvent);
  draw = computed(() => this.dataResource.value()?.draw);
  standings = computed(() => this.dataResource.value()?.standings ?? []);
  games = computed(() => this.dataResource.value()?.games ?? []);
  error = computed(() => this.dataResource.error()?.message || null);
  loading = computed(() => this.dataResource.isLoading());

  private handleError(err: HttpErrorResponse): string {
    // Handle specific error cases
    if (err.status === 404 && err.url) {
      return 'Failed to load draw details';
    }

    // Generic error if no cases match
    return err.statusText || 'An error occurred';
  }
}