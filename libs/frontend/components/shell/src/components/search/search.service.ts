import { HttpErrorResponse } from '@angular/common/http';
import { computed, inject, Injectable } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { Player } from '@app/models';
import { Apollo, gql } from 'apollo-angular';
import { signalSlice } from 'ngxtension/signal-slice';
import { EMPTY, Subject, merge } from 'rxjs';
import { catchError, distinctUntilChanged, map, switchMap, filter, debounceTime, tap } from 'rxjs/operators';
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
      ``;
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

/**
 * [
  {
    "facet_counts": [],
    "found": 1,
    "hits": [
      {
        "document": {
          "club": {
            "clubId": 30076,
            "id": "cb0cfc70-d93c-4e81-92e6-07b5724d40b0",
            "name": "Smash For Fun"
          },
          "firstName": "Glenn",
          "fullName": "Glenn Latomme",
          "id": "90fcc155-3952-4f58-85af-f90794165c89",
          "lastName": "Latomme",
          "memberId": "50104197",
          "objectID": "90fcc155-3952-4f58-85af-f90794165c89",
          "order": 1,
          "slug": "glenn-latomme",
          "type": "player"
        },
        "highlight": {
          "fullName": {
            "matched_tokens": [
              "Latomme"
            ],
            "snippet": "Glenn <mark>Latomme</mark>"
          },
          "lastName": {
            "matched_tokens": [
              "Latomme"
            ],
            "snippet": "<mark>Latomme</mark>"
          }
        },
        "highlights": [
          {
            "field": "lastName",
            "matched_tokens": [
              "Latomme"
            ],
            "snippet": "<mark>Latomme</mark>"
          },
          {
            "field": "fullName",
            "matched_tokens": [
              "Latomme"
            ],
            "snippet": "Glenn <mark>Latomme</mark>"
          }
        ],
        "text_match": 578730123365712000,
        "text_match_info": {
          "best_field_score": "1108091339008",
          "best_field_weight": 14,
          "fields_matched": 2,
          "num_tokens_dropped": 0,
          "score": "578730123365711986",
          "tokens_matched": 1,
          "typo_prefix_score": 0
        }
      }
    ],
    "out_of": 8789,
    "page": 1,
    "request_params": {
      "collection_name": "players",
      "first_q": "latomme",
      "per_page": 10,
      "q": "latomme"
    },
    "search_cutoff": false,
    "search_time_ms": 0
  },
  {
    "facet_counts": [],
    "found": 1,
    "hits": [
      {
        "document": {
          "clubId": 30007,
          "fullName": "Badmintonclub Latem-De Pinte",
          "id": "2940b84d-a3f3-4dbe-94f5-a34689d6f455",
          "name": "Latem-De Pinte",
          "objectID": "2940b84d-a3f3-4dbe-94f5-a34689d6f455",
          "order": 0,
          "slug": "latem-de-pinte",
          "type": "club"
        },
        "highlight": {
          "name": {
            "matched_tokens": [
              "Latem-De"
            ],
            "snippet": "<mark>Latem-De</mark> Pinte"
          }
        },
        "highlights": [
          {
            "field": "name",
            "matched_tokens": [
              "Latem-De"
            ],
            "snippet": "<mark>Latem-De</mark> Pinte"
          }
        ],
        "text_match": 578729985926234200,
        "text_match_info": {
          "best_field_score": "1108024229888",
          "best_field_weight": 15,
          "fields_matched": 1,
          "num_tokens_dropped": 0,
          "score": "578729985926234233",
          "tokens_matched": 1,
          "typo_prefix_score": 4
        }
      }
    ],
    "out_of": 404,
    "page": 1,
    "request_params": {
      "collection_name": "clubs",
      "first_q": "latomme",
      "per_page": 10,
      "q": "latomme"
    },
    "search_cutoff": false,
    "search_time_ms": 0
  },
  {
    "facet_counts": [],
    "found": 3,
    "hits": [
      {
        "document": {
          "date": 1728079200000,
          "id": "fa4bc0ac-9f93-4b36-ba3f-3ce314337bf6",
          "name": "30ste Leietornooi Badmintonclub Latem-De Pinte",
          "objectID": "fa4bc0ac-9f93-4b36-ba3f-3ce314337bf6",
          "order": 3,
          "type": "tournament"
        },
        "highlight": {
          "name": {
            "matched_tokens": [
              "Latem-De"
            ],
            "snippet": "30ste Leietornooi Badmintonclub <mark>Latem-De</mark> Pinte"
          }
        },
        "highlights": [
          {
            "field": "name",
            "matched_tokens": [
              "Latem-De"
            ],
            "snippet": "30ste Leietornooi Badmintonclub <mark>Latem-De</mark> Pinte"
          }
        ],
        "text_match": 578729985926234200,
        "text_match_info": {
          "best_field_score": "1108024229888",
          "best_field_weight": 15,
          "fields_matched": 1,
          "num_tokens_dropped": 0,
          "score": "578729985926234233",
          "tokens_matched": 1,
          "typo_prefix_score": 4
        }
      },
      {
        "document": {
          "date": 1706310000000,
          "id": "b69145aa-9e22-4fc7-8090-bc3302d2eb12",
          "name": "29ste Leietornooi Badmintonclub Latem-De Pinte",
          "objectID": "b69145aa-9e22-4fc7-8090-bc3302d2eb12",
          "order": 3,
          "type": "tournament"
        },
        "highlight": {
          "name": {
            "matched_tokens": [
              "Latem-De"
            ],
            "snippet": "29ste Leietornooi Badmintonclub <mark>Latem-De</mark> Pinte"
          }
        },
        "highlights": [
          {
            "field": "name",
            "matched_tokens": [
              "Latem-De"
            ],
            "snippet": "29ste Leietornooi Badmintonclub <mark>Latem-De</mark> Pinte"
          }
        ],
        "text_match": 578729985926234200,
        "text_match_info": {
          "best_field_score": "1108024229888",
          "best_field_weight": 15,
          "fields_matched": 1,
          "num_tokens_dropped": 0,
          "score": "578729985926234233",
          "tokens_matched": 1,
          "typo_prefix_score": 4
        }
      },
      {
        "document": {
          "date": 1674864000000,
          "id": "d3c1f87f-484e-4921-a448-b04bbc912a63",
          "name": "28ste Leietornooi Badmintonclub Latem-De Pinte",
          "objectID": "d3c1f87f-484e-4921-a448-b04bbc912a63",
          "order": 3,
          "type": "tournament"
        },
        "highlight": {
          "name": {
            "matched_tokens": [
              "Latem-De"
            ],
            "snippet": "28ste Leietornooi Badmintonclub <mark>Latem-De</mark> Pinte"
          }
        },
        "highlights": [
          {
            "field": "name",
            "matched_tokens": [
              "Latem-De"
            ],
            "snippet": "28ste Leietornooi Badmintonclub <mark>Latem-De</mark> Pinte"
          }
        ],
        "text_match": 578729985926234200,
        "text_match_info": {
          "best_field_score": "1108024229888",
          "best_field_weight": 15,
          "fields_matched": 1,
          "num_tokens_dropped": 0,
          "score": "578729985926234233",
          "tokens_matched": 1,
          "typo_prefix_score": 4
        }
      }
    ],
    "out_of": 613,
    "page": 1,
    "request_params": {
      "collection_name": "events",
      "first_q": "latomme",
      "per_page": 10,
      "q": "latomme"
    },
    "search_cutoff": false,
    "search_time_ms": 0
  },
  {
    "facet_counts": [],
    "found": 3,
    "hits": [
      {
        "document": {
          "date": 1728079200000,
          "id": "fa4bc0ac-9f93-4b36-ba3f-3ce314337bf6",
          "name": "30ste Leietornooi Badmintonclub Latem-De Pinte",
          "objectID": "fa4bc0ac-9f93-4b36-ba3f-3ce314337bf6",
          "order": 3,
          "type": "tournament"
        },
        "highlight": {
          "name": {
            "matched_tokens": [
              "Latem-De"
            ],
            "snippet": "30ste Leietornooi Badmintonclub <mark>Latem-De</mark> Pinte"
          }
        },
        "highlights": [
          {
            "field": "name",
            "matched_tokens": [
              "Latem-De"
            ],
            "snippet": "30ste Leietornooi Badmintonclub <mark>Latem-De</mark> Pinte"
          }
        ],
        "text_match": 578729985926234200,
        "text_match_info": {
          "best_field_score": "1108024229888",
          "best_field_weight": 15,
          "fields_matched": 1,
          "num_tokens_dropped": 0,
          "score": "578729985926234233",
          "tokens_matched": 1,
          "typo_prefix_score": 4
        }
      },
      {
        "document": {
          "date": 1706310000000,
          "id": "b69145aa-9e22-4fc7-8090-bc3302d2eb12",
          "name": "29ste Leietornooi Badmintonclub Latem-De Pinte",
          "objectID": "b69145aa-9e22-4fc7-8090-bc3302d2eb12",
          "order": 3,
          "type": "tournament"
        },
        "highlight": {
          "name": {
            "matched_tokens": [
              "Latem-De"
            ],
            "snippet": "29ste Leietornooi Badmintonclub <mark>Latem-De</mark> Pinte"
          }
        },
        "highlights": [
          {
            "field": "name",
            "matched_tokens": [
              "Latem-De"
            ],
            "snippet": "29ste Leietornooi Badmintonclub <mark>Latem-De</mark> Pinte"
          }
        ],
        "text_match": 578729985926234200,
        "text_match_info": {
          "best_field_score": "1108024229888",
          "best_field_weight": 15,
          "fields_matched": 1,
          "num_tokens_dropped": 0,
          "score": "578729985926234233",
          "tokens_matched": 1,
          "typo_prefix_score": 4
        }
      },
      {
        "document": {
          "date": 1674864000000,
          "id": "d3c1f87f-484e-4921-a448-b04bbc912a63",
          "name": "28ste Leietornooi Badmintonclub Latem-De Pinte",
          "objectID": "d3c1f87f-484e-4921-a448-b04bbc912a63",
          "order": 3,
          "type": "tournament"
        },
        "highlight": {
          "name": {
            "matched_tokens": [
              "Latem-De"
            ],
            "snippet": "28ste Leietornooi Badmintonclub <mark>Latem-De</mark> Pinte"
          }
        },
        "highlights": [
          {
            "field": "name",
            "matched_tokens": [
              "Latem-De"
            ],
            "snippet": "28ste Leietornooi Badmintonclub <mark>Latem-De</mark> Pinte"
          }
        ],
        "text_match": 578729985926234200,
        "text_match_info": {
          "best_field_score": "1108024229888",
          "best_field_weight": 15,
          "fields_matched": 1,
          "num_tokens_dropped": 0,
          "score": "578729985926234233",
          "tokens_matched": 1,
          "typo_prefix_score": 4
        }
      }
    ],
    "out_of": 613,
    "page": 1,
    "request_params": {
      "collection_name": "events",
      "first_q": "latomme",
      "per_page": 10,
      "q": "latomme"
    },
    "search_cutoff": false,
    "search_time_ms": 0
  }
]
 */
