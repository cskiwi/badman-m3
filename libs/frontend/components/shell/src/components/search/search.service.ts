import { HttpErrorResponse } from '@angular/common/http';
import { computed, Injectable } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { signalSlice } from 'ngxtension/signal-slice';
import { EMPTY, merge, Subject } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, filter, map, switchMap } from 'rxjs/operators';

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
  private readonly initialState: SearchState = {
    results: [],
    error: null,
    loading: true,
  };

  // selectors
  results = computed(() => this.state().results);
  error = computed(() => this.state().error);
  loading = computed(() => this.state().loading);

  //sources
  private readonly error$ = new Subject<string | null>();
  private readonly filterChanged$ = this.filter.valueChanges.pipe(
    distinctUntilChanged((a, b) => a.query === b.query),
    filter((filter) => !!filter.query),
    filter((filter) => `${filter.query}`.length > 2),
    debounceTime(300),
  );

  private readonly data$ = this.filterChanged$.pipe(
    switchMap((filter) => this._loadData(filter)),
    catchError((err) => {
      this.error$.next(err);
      return EMPTY;
    }),
  );

  sources$ = merge(
    this.data$.pipe(
      map((data) => {
        const algoliaResults = data?.algoliaAll?.results?.[0].hits || [];
        const typesenseResults = (data?.typesense || [])
          .reduce(
            (acc, curr) => acc.concat(curr.hits),
            [] as {
              document: Hit;
              score: number;
            }[][],
          )
          .flat()
          .sort((a, b) => b.score - a.score)
          .map((hit) => hit.document);

        // combine all the algolia hits
        return [...algoliaResults, ...typesenseResults];
      }),
      map((data) => ({
        results: data?.map(
          (hit) =>
            ({
              linkType: hit.type,
              linkId: hit.objectID,
              title: hit.type !== 'player' ? hit.name : `${hit.firstName} ${hit.lastName}`,
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
            algoliaType: {
              results: {
                hits: Hit[];
              }[];
            };
            algoliaAll: {
              results: {
                hits: Hit[];
              }[];
            };
            typesense: typesenseHit[];
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

export type typesenseHit = {
  found: number;
  hits: {
    document: Hit;
    score: number;
  }[];
};
