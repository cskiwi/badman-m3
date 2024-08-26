import { HttpErrorResponse } from '@angular/common/http';
import { computed, inject, Injectable } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { Player } from '@app/models';
import { Apollo, gql } from 'apollo-angular';
import { signalSlice } from 'ngxtension/signal-slice';
import { EMPTY, Subject, merge } from 'rxjs';
import {
  catchError,
  distinctUntilChanged,
  map,
  switchMap,
  filter,
  debounceTime,
} from 'rxjs/operators';
import { ObjectId } from 'typeorm';

interface SearchState {
  results: SearchHit[];
  loading: boolean;
  error: string | null;
}

export type SearchHit = {
  linkType: string;
  linkId: string;
  title: string;
};

@Injectable({
  providedIn: 'root',
})
export class SearchService {
  filter = new FormGroup({
    query: new FormControl<string | null>(null),
  });

  // state
  private initialState: SearchState = {
    results: [],
    error: null,
    loading: true,
  };

  // selectors
  results = computed(() => this.state().results);
  error = computed(() => this.state().error);
  loading = computed(() => this.state().loading);

  //sources
  private error$ = new Subject<string | null>();
  private filterChanged$ = this.filter.valueChanges.pipe(
    distinctUntilChanged((a, b) => a.query === b.query),
    filter((filter) => !!filter.query),
    filter((filter) => `${filter.query}`.length > 2),
    debounceTime(300),
  );

  private data$ = this.filterChanged$.pipe(
    switchMap((filter) => this._loadData(filter)),
    catchError((err) => {
      this.error$.next(err);
      return EMPTY;
    }),
  );

  sources$ = merge(
    this.data$.pipe(
      map((data) => {
        return {
          results: data?.results?.[0].hits,
          loading: false,
        };
      }),
      map((data) => ({
        results: data.results?.map(
          (hit) =>
            ({
              linkType: hit.type,
              linkId: hit.objectID,
              title:
                hit.type === 'club'
                  ? hit.name
                  : `${hit.firstName} ${hit.lastName}`,
            }) as SearchHit,
        ),
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
    }>,
  ) {
    return fetch(`/api/v1/search?query=${filter.query}`)
      .then(
        (res) =>
          res.json() as Promise<{
            results: {
              hits: Hit[];
            }[];
          }>,
      )
      .catch((err) => {
        this.handleError(err);
      });
  }

  private handleError(err: HttpErrorResponse) {
    // Handle specific error cases
    if (err.status === 404 && err.url) {
      this.error$.next(`Failed to load data`);
      return;
    }

    // Generic error if no cases match
    this.error$.next(err.statusText);
  }
}

export type Hit = PlayerHit | ClubHit;

export type PlayerHit = {
  firstName: string;
  slug: string;
  lastName: string;
  memberId: string;
  type: 'player';
  club: {
    id: string;
    name: string;
  };
  order: number;
  objectID: string;
};

export type ClubHit = {
  name: string;
  objectID: string;
  type: 'club';
};
