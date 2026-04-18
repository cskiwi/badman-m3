import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Apollo, gql } from 'apollo-angular';
import { lastValueFrom } from 'rxjs';
import { resource } from '@angular/core';

export interface ClubUpcomingEncounterRow {
  id: string;
  date: string | null;
  homeTeam: { id: string; name: string | null } | null;
  awayTeam: { id: string; name: string | null } | null;
}

@Component({
  selector: 'app-club-schedule-card',
  standalone: true,
  imports: [DatePipe, RouterModule],
  templateUrl: './club-schedule-card.component.html',
  styleUrl: './club-schedule-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClubScheduleCardComponent {
  private readonly apollo = inject(Apollo);

  readonly clubId = input.required<string | null>();
  readonly season = input.required<number | null>();
  readonly take = input<number>(5);

  private readonly dataResource = resource({
    params: () => ({ clubId: this.clubId(), season: this.season(), take: this.take() }),
    loader: async ({ params, abortSignal }) => {
      if (!params.clubId || params.season == null) return [];
      try {
        const result = await lastValueFrom(
          this.apollo.query<{ club: { upcomingEncounters: ClubUpcomingEncounterRow[] } | null }>({
            query: gql`
              query ClubUpcomingEncounters($id: ID!, $take: Int!, $season: Int!) {
                club(id: $id) {
                  id
                  upcomingEncounters(take: $take, season: $season) {
                    id
                    date
                    homeTeam {
                      id
                      name
                    }
                    awayTeam {
                      id
                      name
                    }
                  }
                }
              }
            `,
            variables: { id: params.clubId, take: params.take, season: params.season },
            context: { signal: abortSignal },
          }),
        );
        return result.data?.club?.upcomingEncounters ?? [];
      } catch (err) {
        console.warn('Club schedule card query failed', err as HttpErrorResponse);
        return [];
      }
    },
  });

  readonly items = computed(() => {
    const list = this.dataResource.value() ?? [];
    const now = Date.now();
    return list.filter((e) => !e.date || new Date(e.date).getTime() > now);
  });

  readonly loading = computed(() => this.dataResource.isLoading());
}
