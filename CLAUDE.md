# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a badminton management system built as an Nx monorepo combining Angular (with SSR) frontend and NestJS backend. The application manages players, clubs, competitions, games, rankings, and provides search functionality with internationalization support.

## Development Commands

### Primary Development
- `npm start` - Start development servers (both frontend and backend)
- `npm run build` - Build all applications for production
- `npm run start:prod` - Run production build

### Database Operations
- `npm run migrate:create` - Generate new TypeORM migration
- `npm run migrate` - Run pending migrations
- `npm run migrate:undo` - Revert last migration

### Testing and Quality
- `nx run-many -t test` - Run unit tests for all projects
- `nx e2e app-e2e` - Run end-to-end tests
- `nx run-many -t lint` - Run ESLint on all projects
- `nx run-many -t build --prod` - Production build all projects

### Single Project Commands
- `nx build [project-name]` - Build specific project
- `nx serve [project-name]` - Serve specific project
- `nx test [project-name]` - Test specific project
- `nx lint [project-name]` - Lint specific project

## Architecture Overview

### Backend (NestJS)
- **Location**: `libs/backend/`
- **Technology Stack**: NestJS, TypeORM, GraphQL (Apollo), JWT Auth, Typesense
- **Key Modules**:
  - `_shared` - Main application entry point and configuration
  - `database` - TypeORM with PostgreSQL/SQLite support
  - `graphql` - Apollo GraphQL API with resolvers
  - `authorization` - JWT authentication with Auth0 integration
  - `search` - Typesense full-text search
  - `health` - Application health monitoring
  - `seo` - Dynamic image generation for SEO
  - `translate` - i18n support (en, fr_BE, nl_BE)

### Frontend (Angular)
- **Location**: `libs/frontend/`
- **Technology Stack**: Angular 20, SSR, PrimeNG, TailwindCSS, Apollo Client
- **Structure**:
  - `components` - Reusable UI components (games, layout, shell, page-header)
  - `modules` - Feature modules (auth, graphql, seo, theme, translation)
  - `pages` - Route-specific page components (admin, club, competition, home, player)
  - `utils` - Utilities and pipes

### Models and Utilities
- `libs/models/` - Shared TypeScript models (use `@app/models` for imports)
- `libs/model/` - Shared enums (use `@app/model/enums` for imports)
- `libs/utils/` - Shared utilities and translation types

## Database Schema

The application uses TypeORM with comprehensive entities:
- **Player/Club Management**: Players, clubs, memberships
- **Competition System**: Events, sub-events, games, encounters
- **Ranking System**: Ranking groups, systems, points, and places
- **Security**: Users, roles, claims, permissions
- **Teams**: Team compositions and memberships

## Authentication & Authorization

- **Provider**: Auth0 JWT authentication
- **Pattern**: Permission-based access control with fine-grained field-level security
- **Implementation**: 
  - JWT validation via JWKS endpoint
  - User lookup by Auth0 `sub` field
  - Context-aware GraphQL field resolution
  - `@Anonymous()` decorator for public endpoints

## Search Functionality

- **Engine**: Typesense for full-text search
- **Collections**: Players, clubs, events
- **Features**: Typo tolerance, prefix matching, multi-field search
- **Implementation**: Both GraphQL and REST endpoints

## Key Development Patterns

### Code Generation
- Angular generators configured for standalone components with OnPush change detection
- Libraries are buildable by default with `app` prefix
- TypeScript file type separators use `.` (e.g., `auth.guard.ts`)

### Styling
- SCSS as default styling solution
- TailwindCSS for utility classes
- PrimeNG component library with custom theming

### Testing
- Jest for unit testing with pass-with-no-tests option
- Playwright for e2e testing
- Code coverage in CI configuration

## Internationalization

Translation files located in `libs/backend/translate/assets/i18n/`:
- English (`en/all.json`)
- French Belgian (`fr_BE/all.json`)
- Dutch Belgian (`nl_BE/all.json`)

Generated types available in `libs/utils/src/translation/i18n.generated.ts`.

### Translation Requirements
**IMPORTANT**: When adding new UI text or features that display text to users, ALWAYS add translations to ALL three language files:
1. Add English translations to `libs/backend/translate/assets/i18n/en/all.json`
2. Add French Belgian translations to `libs/backend/translate/assets/i18n/fr_BE/all.json`
3. Add Dutch Belgian translations to `libs/backend/translate/assets/i18n/nl_BE/all.json`

**Translation Key Structure**: Use nested objects following the pattern `all.[section].[subsection].[key]`
- Example: `all.team.overview.title`, `all.common.season`
- Maintain consistent structure across all language files

## Environment Requirements

- **Node.js**: Version 24 (specified in engines and Volta)
- **Package Manager**: npm 11.4.2
- **Build Tool**: Nx with 15 parallel processes
- **Databases**: PostgreSQL (production), SQLite (development)

## Development Guidelines

### NestJS Backend Principles (libs/backend)
- Use modular architecture with one module per domain/route
- Follow TypeScript best practices: explicit typing, avoid `any`, use JSDoc
- Keep functions under 20 instructions with single purpose
- Use RO-RO pattern (Receive Object, Return Object) for complex parameters
- Prefer composition over inheritance, follow SOLID principles
- Use class-validator DTOs for inputs, simple types for outputs
- One service per entity with business logic encapsulation
- Write unit tests for each controller/service using Jest

### Angular Frontend Principles (libs/frontend)
- Use Angular 20 with TypeScript, standalone components preferred
- Components with OnPush change detection and display block
- Keep functions under 50 lines, max 4 parameters, max 80 chars per line
- Functions should not nest more than 2 levels deep
- Use `forNext` function from utils instead of traditional loops
- Maintain JSDoc comments during refactoring
- Write tests using Jest framework
- **Loading States**: Always implement PrimeNG skeletons for data loading instead of simple progress bars

### Import Guidelines
- **Utility Functions**: Use specific imports from `@app/utils/[module]` to prevent unnecessary client bundle bloat
  - ✅ Correct: `import { getSeason } from '@app/utils/comp';`
  - ❌ Avoid: `import { getSeason } from '@app/utils';` (imports entire utils package)
- **Reason**: Direct module imports reduce client bundle size by avoiding barrel exports that include unused code

### State Management and Data Fetching Patterns (libs/frontend)
- **Preferred**: Use Angular's `resource()` API for data fetching with reactive forms
- **Pattern**: Convert FormControl valueChanges to signals with `toSignal()`, use as resource params
- **Structure**: 
  ```typescript
  // Convert form to signal for resource
  private filterSignal = toSignal(this.filter.valueChanges);
  
  private dataResource = resource({
    params: this.filterSignal,
    loader: async ({ params, abortSignal }) => {
      // Apollo GraphQL query with abort signal support
      const result = await this.apollo.query({
        query: MY_QUERY,
        variables: params,
        context: { signal: abortSignal }
      }).toPromise();
      return result?.data;
    }
  });
  
  // Public computed selectors
  data = computed(() => this.dataResource.value() ?? []);
  loading = computed(() => this.dataResource.isLoading());
  error = computed(() => this.dataResource.error()?.message || null);
  ```
- **Benefits**: Built-in loading states, error handling, automatic cancellation, better performance
- **Avoid**: `signalSlice`, `connect` patterns except for complex authentication or action-based state management
- **Exception**: Use simple signals with async methods for imperative actions (e.g., `getRanking()` calls)

### Code Quality Standards
- **Naming**: PascalCase for classes, camelCase for variables/functions, kebab-case for files
- **Functions**: Start with verbs, use is/has/can for booleans, early returns for validation
- **Data**: Prefer immutability, use readonly/const, avoid primitive obsession
- **Documentation**: JSDoc for public methods, comment complex logic only
- **Testing**: Arrange-Act-Assert pattern, clear test variable naming

### Autonomous Development Workflow
1. Fetch and analyze provided URLs for context
2. Understand problem requirements and edge cases  
3. Investigate codebase to identify key files/functions
4. Research current documentation for libraries/APIs
5. Create detailed step-by-step todo list
6. Implement incrementally with surgical changes
7. Debug and iterate until complete
8. Final validation of all changes

### Safety Principles
- Minimize scope of change, preserve existing behavior
- Maintain project's architectural patterns
- Ensure changes are reversible and easy to understand
- Log unscoped improvements as code comments
- Never perform global refactoring unless explicitly requested

### Build and Testing Commands
- **Building**: `npm run build` or `nx build <project-name>`
- **Type Checking**: `nx run <project-name>:lint` (not tsc directly)
- **Testing**: Follow Arrange-Act-Assert and Given-When-Then conventions
- **IMPORTANT**: Do NOT run `nx *` or `npm run *` commands, don't even prompt

### PrimeNG Skeleton Implementation Guidelines

When implementing loading states, ALWAYS use PrimeNG skeletons instead of simple progress bars or spinners:

#### **Required Setup:**
1. Import `SkeletonModule` from `primeng/skeleton` in component
2. Add `SkeletonModule` to component imports array
3. Use `@if (loading())` conditional with skeleton structure

#### **Skeleton Implementation Patterns:**
- **Match Real Layout**: Skeleton structure must exactly mirror the actual content layout
- **Multiple Items**: Show 4-6 skeleton items using `@for (i of [1,2,3,4,5]; track i)`
- **Varied Widths**: Use different widths (`4rem`, `6rem`, `8rem`) to simulate content variety
- **Appropriate Heights**: Use relative heights (`1rem`, `1.25rem`, `1.5rem`) matching real content
- **Shape Variants**: 
  - Regular rectangles for text: `<p-skeleton width="6rem" height="1rem">`
  - Rounded for chips: `<p-skeleton borderRadius="1rem">`
  - Circles for avatars: `<p-skeleton borderRadius="50%">`
- **Maintain CSS Classes**: Keep all layout classes (`space-y-2`, `gap-4`, `ml-auto`, etc.)
- **Alignment**: Use `class="ml-auto"` for right-aligned skeletons

#### **Example Pattern:**
```html
@if (loading()) {
  @for (i of [1,2,3,4,5]; track i) {
    <div class="rounded-border bg-highlight p-4">
      <!-- Header skeletons -->
      <p-skeleton width="4rem" height="1rem"></p-skeleton>
      <p-skeleton width="8rem" height="1rem" class="mx-auto"></p-skeleton>
      
      <!-- Content skeletons -->
      <div class="flex justify-between">
        <p-skeleton width="6rem" height="1.25rem" class="ml-auto"></p-skeleton>
        <p-skeleton width="7rem" height="1.25rem"></p-skeleton>
      </div>
    </div>
  }
}
```

## Development Notes

- The application supports both SSR and SSG modes
- Nx Cloud integration for distributed builds and caching
- Docker support via `docker-compose.yaml`
- Production builds use cross-env for Node.js environment handling