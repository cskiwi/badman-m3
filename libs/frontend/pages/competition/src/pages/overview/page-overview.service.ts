import { HttpErrorResponse } from '@angular/common/http';
import { computed, inject } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { CompetitionEvent } from '@app/models';
import { Apollo, gql } from 'apollo-angular';
import { signalSlice } from 'ngxtension/signal-slice';
import { EMPTY, Subject, merge } from 'rxjs';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  map,
  startWith,
  switchMap
} from 'rxjs/operators';

interface OverviewState {
  competitions: CompetitionEvent[];
  loading: boolean;
  error: string | null;
}

export class OverviewService {
  private readonly apollo = inject(Apollo);

  filter = new FormGroup({
    query: new FormControl(undefined),
  });

  // state
  private initialState: OverviewState = {
    competitions: [],
    error: null,
    loading: true,
  };

  // selectors
  competitions = computed(() => this.state().competitions);
  error = computed(() => this.state().error);
  loading = computed(() => this.state().loading);

  //sources
  private error$ = new Subject<string | null>();
  private filterChanged$ = this.filter.valueChanges.pipe(
    startWith(this.filter.value),
    distinctUntilChanged(),
  );

  private data$ = this.filterChanged$.pipe(
    debounceTime(300), // Queries are better when debounced
    switchMap((filter) => this._loadData(filter)),
    catchError((err) => {
      this.error$.next(err);
      return EMPTY;
    }),
  );

  sources$ = merge(
    this.data$.pipe(
      map((competitions) => ({
        competitions,
        loading: false,
      })),
    ),
    this.error$.pipe(map((error) => ({ error }))),
    this.filterChanged$.pipe(map(() => ({ loading: true }))),
  );

  state = signalSlice({
    initialState: this.initialState,
    sources: [this.sources$],
  });

  private _loadData(
    filter: Partial<{
      query: string | null;
      where: { [key: string]: unknown } | null;
      emtpyWhere: { [key: string]: unknown };
    }>,
  ) {
    return this.apollo
      .query<{ competitionEvents: CompetitionEvent[] }>({
        query: gql`
          query Competitions($args: CompetitionEventArgs) {
            competitionEvents(args: $args) {
              id
              name
              slug
            }
          }
        `,
        variables: {
          args: { where: this._competitionSearchWhere(filter.query) },
        },
      })
      .pipe(
        catchError((err) => {
          this.handleError(err);
          return EMPTY;
        }),
        map((result) => {
          if (!result?.data.competitionEvents) {
            throw new Error('No competitions found');
          }
          return result.data.competitionEvents;
        }),
      );
  }

  private handleError(err: HttpErrorResponse) {
    // Handle specific error cases
    if (err.status === 404 && err.url) {
      this.error$.next(`Failed to load competitions`);
      return;
    }

    // Generic error if no cases match
    this.error$.next(err.statusText);
  }

  private _competitionSearchWhere(query: string | null | undefined) {
    const parts = query
      ?.toLowerCase()
      .replace(/[;\\\\/:*?"<>|&',]/, ' ')
      .split(' ')
      .map((part) => part.trim());
    const queries: unknown[] = [];

    for (const part of parts ?? []) {
      if (part.length < 1) continue;
      queries.push({ fullName: { $iLike: `%${part}%` } });
    }

    if (queries.length === 0) {
      return;
    }

    return queries;
  }
}
