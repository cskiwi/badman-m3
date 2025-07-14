import { computed, Injectable, signal } from '@angular/core';
import { httpResource } from '@angular/common/http';

export type SearchHit = {
  linkType: string;
  linkId: string;
  title: string;
  subtitle?: string; // Additional information like club name for players
};

@Injectable({
  providedIn: 'root',
})
export class SearchService {
  // Signal for the search query input
  private readonly queryInput = signal<string>('');

  // Signal for the debounced query that actually triggers searches
  private readonly query = signal<string>('');

  private debounceTimer: number | null = null;

  // Computed signal to determine if query is valid for searching
  private readonly shouldSearch = computed(() => {
    const q = this.query().trim();
    return q.length > 2;
  });

  // HTTP resource for search requests
  private readonly searchResource = httpResource<Array<{ hit: Hit; score?: number }>>(
    () => {
      const q = this.query().trim();
      if (!this.shouldSearch()) {
        return undefined; // Don't make request if query is too short
      }
      return `/api/v1/search?query=${encodeURIComponent(q)}`;
    },
    {
      defaultValue: [],
    },
  );

  // Computed signals for public API
  readonly loading = computed(() => this.searchResource.isLoading());
  readonly error = computed(() => this.searchResource.error()?.message ?? null);
  readonly results = computed(() => {
    const data = this.searchResource.value();
    if (!Array.isArray(data)) {
      console.log('Search: Data is not an array, returning empty results');
      return [];
    }

    const hits = data.map((result: { hit: Hit; score?: number }) => result.hit).filter(Boolean);

    const searchHits: SearchHit[] = hits
      .map((hit) => {
        // Determine type based on document properties if type field is missing
        let linkType = hit.type;
        if (!linkType) {
          if (hit.firstName && hit.lastName) {
            linkType = 'player';
          } else if (hit.name) {
            linkType = 'club'; // Default to club for entities with just a name
          } else {
            linkType = 'club'; // Fallback
          }
        }

        // Create a safe title based on available data
        let title = '';
        let subtitle = '';
        if (linkType === 'player') {
          const firstName = hit.firstName || '';
          const lastName = hit.lastName || '';
          title = `${firstName} ${lastName}`.trim();
          // Fallback to name if both firstName and lastName are empty
          if (!title && hit.name) {
            title = hit.name;
          }
          // Final fallback for players using memberId if available
          if (!title && 'memberId' in hit && hit.memberId) {
            title = hit.memberId;
          }
          // Last resort fallback
          if (!title) {
            title = 'Unknown Player';
          }
          
          // Add club information as subtitle for players
          if ('club' in hit && hit.club?.name) {
            subtitle = hit.club.name;
          }
        } else {
          title = hit.name || 'Unknown';
        }

        // Skip hits with empty titles
        if (!title || title.trim().length === 0) {
          console.warn('Search: Hit with empty title:', hit);
          return null;
        }

        // Ensure we have a valid objectID
        const linkId = hit.objectID || '';
        if (!linkId) {
          console.warn('Search: Hit without valid ID:', hit);
          return null;
        }

        const searchHit = {
          linkType,
          linkId,
          title,
          subtitle: subtitle || undefined,
        } as SearchHit;

        return searchHit;
      })
      .filter((hit): hit is SearchHit => hit !== null);

    return searchHits;
  });

  // Method to update search query with debouncing
  updateQuery(query: string) {
    const trimmedQuery = query || '';
    this.queryInput.set(trimmedQuery);

    // Clear existing timer
    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer);
    }

    // Set new timer for debouncing (300ms)
    this.debounceTimer = window.setTimeout(() => {
      this.query.set(trimmedQuery);
      this.debounceTimer = null;
    }, 300);
  }

  // Method to get current query value
  getCurrentQuery(): string {
    return this.queryInput();
  }
}

export type Hit = PlayerHit | ClubHit | EventHit;

export type PlayerHit = {
  firstName: string;
  slug: string;
  lastName: string;
  memberId: string;
  type?: 'player';
  club?: {
    id: string;
    name: string;
  };
  order: number;
  objectID: string;
  name?: string; // Sometimes player hits might have name instead of firstName/lastName
};

export type ClubHit = {
  name: string;
  objectID: string;
  type?: 'club';
  order: number;
  firstName?: never; // Ensure clubs don't have firstName
  lastName?: never; // Ensure clubs don't have lastName
};

export type EventHit = {
  name: string;
  objectID: string;
  type?: 'event';
  order: number;
  firstName?: never; // Ensure events don't have firstName
  lastName?: never; // Ensure events don't have lastName
};

export type typesenseHit = {
  found: number;
  hits: {
    document: Hit;
    score: number;
  }[];
};
