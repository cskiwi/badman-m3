---
name: nestjs-development
description: NestJS backend development patterns with GraphQL, TypeORM, and modular architecture. Use when building backend features, APIs, or services in this project.
---

# NestJS Backend Development

Provides comprehensive guidance for building NestJS backend features following modular architecture, GraphQL (code-first) schema design, TypeORM data persistence, and modern TypeScript best practices.

## When to Use

- Working with NestJS backend code (`libs/backend/**`, `apps/api/**`)
- Building GraphQL resolvers, services, or modules
- Creating or modifying TypeORM entities
- Implementing guards, interceptors, or middleware
- Setting up dependency injection patterns
- Writing DTOs with class-validator
- Working with BullMQ job queues
- User mentions NestJS, backend, GraphQL, resolver, or API

## Technology Stack

### NestJS Framework
- **NestJS 11+** with modular architecture
- **TypeScript** with strict mode
- **GraphQL** (code-first with Apollo Server)
- **TypeORM** for data persistence (PostgreSQL / SQLite)
- **class-validator** for DTO validation
- **class-transformer** for serialization

### Authentication & Authorization
- **Auth0** for identity management
- **JWT** validation via JWKS (`jwks-rsa`)
- **PermGuard** custom guard for route protection
- **@User()** custom decorator for injecting authenticated user

### Job Queues & Background Processing
- **BullMQ** with `@nestjs/bullmq` for async job processing
- **Redis** as queue backend

### Search
- **Typesense** for full-text search

### Communication
- **Socket.IO** via `@nestjs/websockets` for real-time features

### API Documentation
- **Swagger/OpenAPI** via `@nestjs/swagger`

### Testing
- **Jest** for unit and integration testing

## TypeScript General Guidelines

### Basic Principles

- Use English for all code and documentation.
- Always declare the type of each variable and function (parameters and return value).
- Avoid using `any`.
- Create necessary types.
- Use JSDoc to document public classes and methods.
- Don't leave blank lines within a function.
- One export per file.

### Nomenclature

- Use PascalCase for classes.
- Use camelCase for variables, functions, and methods.
- Use kebab-case for file and directory names.
- Use UPPERCASE for environment variables.
- Avoid magic numbers and define constants.
- Start each function with a verb.
- Use verbs for boolean variables: `isLoading`, `hasError`, `canDelete`, etc.
- Use complete words instead of abbreviations and correct spelling.
  - Except for standard abbreviations like API, URL, etc.
  - Except for well-known abbreviations: `i`, `j` for loops, `err` for errors, `ctx` for contexts, `req`, `res`, `next` for middleware parameters.

### Functions

- Write short functions with a single purpose. Less than 20 instructions.
- Name functions with a verb and something else.
  - If it returns a boolean, use `isX` or `hasX`, `canX`, etc.
  - If it doesn't return anything, use `executeX` or `saveX`, etc.
- Avoid nesting blocks by:
  - Early checks and returns.
  - Extraction to utility functions.
- Use higher-order functions (`map`, `filter`, `reduce`, etc.) to avoid function nesting.
- Use arrow functions for simple functions (less than 3 instructions).
- Use named functions for non-simple functions.
- Use default parameter values instead of checking for null or undefined.
- Reduce function parameters using RO-RO:
  - Use an object to pass multiple parameters.
  - Use an object to return results.
  - Declare necessary types for input arguments and output.
- Use a single level of abstraction.

### Data

- Don't abuse primitive types and encapsulate data in composite types.
- Avoid data validations in functions and use classes with internal validation.
- Prefer immutability for data.
- Use `readonly` for data that doesn't change.
- Use `as const` for literals that don't change.

### Classes

- Follow SOLID principles.
- Prefer composition over inheritance.
- Declare interfaces to define contracts.
- Write small classes with a single purpose.
  - Less than 200 instructions.
  - Less than 10 public methods.
  - Less than 10 properties.

### Exceptions

- Use exceptions to handle errors you don't expect.
- If you catch an exception, it should be to:
  - Fix an expected problem.
  - Add context.
  - Otherwise, use a global handler.

### Testing

- Follow the Arrange-Act-Assert convention for tests.
- Name test variables clearly.
- Follow the convention: `inputX`, `mockX`, `actualX`, `expectedX`, etc.
- Write unit tests for each public function.
- Use test doubles to simulate dependencies.
  - Except for third-party dependencies that are not expensive to execute.
- Write acceptance tests for each module.
- Follow the Given-When-Then convention.

## NestJS-Specific Guidelines

### Modular Architecture

- Use modular architecture.
- Encapsulate the API in modules.
  - One module per main domain/route.
  - One controller for its route (REST endpoints).
  - GraphQL resolvers for query/mutation endpoints.
  - A models folder with data types.
  - DTOs validated with class-validator for inputs.
  - Declare simple types for outputs.
  - A services module with business logic and persistence.
  - Entities with TypeORM for data persistence.
  - One service per entity.
- A core module for NestJS artifacts:
  - Global filters for exception handling.
  - Global middlewares for request management.
  - Guards for permission management (`PermGuard`).
  - Interceptors for request management.
- A shared module for services shared between modules:
  - Utilities.
  - Shared business logic.

### GraphQL (Code-First with Apollo)

- Use code-first approach with decorators.
- Define `@ObjectType()` classes for output types.
- Define `@InputType()` classes for input types.
- Use `@Resolver()` decorators for resolver classes.
- Use `@Query()`, `@Mutation()`, and `@Subscription()` decorators.
- Implement `@ResolveField()` for computed or relational fields.
- Keep resolvers thin — delegate business logic to services.
- Apollo Server configured with schema reporting and usage reporting plugins.

### REST Controllers

- Use `@Controller()` for REST endpoints alongside GraphQL.
- Global API prefix: `/api` with URI versioning (default v1).
- Swagger/OpenAPI documentation for REST endpoints.
- Use for specific use cases: health checks, translations, search, file uploads.

### Dependency Injection

- Use constructor injection for all dependencies.
- Register providers in the appropriate module.
- Use `@Injectable()` decorator for services.
- Use custom providers (`useFactory`, `useValue`) when needed.
- Scope services appropriately (default singleton, request-scoped when needed).

### DTOs and Validation

- Use `class-validator` decorators for input validation.
- Use `class-transformer` for serialization/deserialization.
- Define separate DTOs for create, update, and query operations.
- Never expose entity internals directly — map to DTOs or GraphQL types.

### TypeORM Entities (Active Record)

- Entities extend `BaseEntity` and use TypeORM's **Active Record** pattern.
- Use `@Entity()` decorator with table schemas for organization (e.g., `ranking`, `event`, `security`, `personal`).
- Use `@Column()`, `@ManyToOne()`, `@OneToMany()`, `@ManyToMany()` for relationships.
- Call static methods on entity classes directly: `Game.find()`, `Game.findOne()`, `game.save()`.
- Keep entity logic minimal — use services for complex business rules.
- Use migrations for schema changes (stored in `libs/backend/database/src/migrations/`).
- Entities are defined in `@app/models` package and auto-discovered by the database module.

### Authentication & Authorization

- Use `PermGuard` for JWT validation + user loading.
- Auth0 provides identity via JWKS (JSON Web Key Set).
- Token extracted from `Authorization: Bearer <token>` header.
- Auth0 `sub` (subject) linked to Player model.
- `@User()` custom decorator injects the authenticated user into resolvers/controllers.
- `@AllowAnonymous()` decorator for public endpoints.
- Configuration via environment variables: `AUTH0_ISSUER_URL`, `AUTH0_AUDIENCE`, `AUTH0_CLIENT_ID`.

### Job Queues (BullMQ)

- Use `@nestjs/bullmq` for background job processing.
- Define processors with `@Processor()` decorator.
- Queue jobs from services using `@InjectQueue()`.
- Redis backend for job persistence.

### Error Handling

- Use NestJS built-in exception filters.
- Throw `HttpException` subclasses (`NotFoundException`, `BadRequestException`, etc.).
- For GraphQL, exceptions are automatically mapped to GraphQL errors.
- Use global exception filters for unhandled errors.
- Always provide meaningful error messages.

### Guards and Interceptors

- Use guards for authentication and authorization.
- Use interceptors for logging, transformation, and caching.
- Apply guards at controller, resolver, or method level as appropriate.
- Use `@UseGuards()` and `@UseInterceptors()` decorators.

### Testing

- Use the standard Jest framework for testing.
- Write tests for each controller, resolver, and service.
- Write end-to-end tests for each API module.
- Use `Test.createTestingModule()` for unit test setup.
- Mock external dependencies with Jest mocks or custom providers.

## Project Structure

```
libs/backend/
├── authorization/           # Auth guards (PermGuard), Auth0/JWT, user loading
├── database/                # TypeORM configuration, DataSource, migrations
├── graphql/                 # GraphQL resolvers (56+), Apollo config
├── health/                  # Health check endpoints (@nestjs/terminus)
├── ranking/                 # Ranking system business logic
├── search/                  # Search functionality (Typesense integration)
├── seo/                     # SEO utilities & image generation
├── sync/                    # Data sync logic & BullMQ job queues
├── tournament-api/          # Tournament API integration
└── translate/               # i18n/translation services

apps/api/                    # NestJS API application entry point
apps/sync-worker/            # Background worker application (BullMQ)
```

## Key Patterns

### Active Record Pattern

Entities extend `BaseEntity` and use TypeORM's Active Record pattern — queries are called directly on the entity class rather than through injected repositories:

```typescript
// Active Record: call static methods on the entity class directly
const game = await Game.findOne({ where: { id } });
const games = await Game.find(args);
```

### GraphQL Args Pattern (Dynamic Input Args)

The project uses a **dynamic Args generation system** for querying lists of any entity type. All Args classes are auto-generated at startup from entity metadata.

**How it works:**

1. A factory function `args<T>(name)` generates an `@InputType` class per entity (e.g., `GameArgs`, `PlayerArgs`).
2. Each Args class includes `skip`, `take`, `order`, and `where` fields — auto-derived from the entity's columns and relations.
3. Static methods `toFindOneOptions()` and `toFindManyOptions()` convert GraphQL input into TypeORM `FindOptions`.

**Usage in resolvers:**

```typescript
@Query(() => [Game])
@AllowAnonymous()
async games(
  @Args('args', { type: () => GameArgs, nullable: true })
  inputArgs?: InstanceType<typeof GameArgs>,
): Promise<Game[]> {
  const args = GameArgs.toFindManyOptions(inputArgs);
  return Game.find(args);
}
```

**Key components:**

- **`args<T>(name)`** — Factory in `libs/backend/graphql/src/utils/list.args.ts` that creates Args classes with `skip`, `take`, `order`, `where` fields.
- **`SortOrderType`** — Dynamically generates `@InputType` for sorting (e.g., `GameSortOrder`) from entity columns. Supports nested relation sorting.
- **`WhereInputType`** — Dynamically generates `@InputType` for filtering (e.g., `GameWhereInput`) with typed operators (`eq`, `ne`, `in`, `like`, `ilike`, `isNull`, etc.). Supports `AND`/`OR` logical grouping.
- **`GraphQLWhereConverter`** — Converts GraphQL where inputs into TypeORM `FindOptionsWhere`.

**All Args are exported from** `libs/backend/graphql/src/args/index.ts` and auto-generated from entities in `@app/models`.

**For `@ResolveField` with filtering:**

```typescript
@ResolveField(() => [GamePlayerMembership], { nullable: true })
async gamePlayerMemberships(
  @Parent() { id }: Game,
  @Args('args', { type: () => GamePlayerMembershipArgs, nullable: true })
  inputArgs?: InstanceType<typeof GamePlayerMembershipArgs>,
) {
  const args = GamePlayerMembershipArgs.toFindManyOptions(inputArgs);
  // Merge parent context into where clause
  if (args.where?.length > 0) {
    args.where = args.where.map((where) => ({ ...where, gameId: id }));
  } else {
    args.where = [{ gameId: id }];
  }
  return GamePlayerMembership.find(args);
}
```

### Resolver Pattern

```typescript
@Resolver(() => Game)
export class GameResolver {
  @Query(() => Game)
  @AllowAnonymous()
  async game(@Args('id', { type: () => ID }) id: string): Promise<Game> {
    const game = await Game.findOne({ where: { id } });
    if (!game) {
      throw new NotFoundException(id);
    }
    return game;
  }

  @Query(() => [Game])
  @AllowAnonymous()
  async games(
    @Args('args', { type: () => GameArgs, nullable: true })
    inputArgs?: InstanceType<typeof GameArgs>,
  ): Promise<Game[]> {
    const args = GameArgs.toFindManyOptions(inputArgs);
    return Game.find(args);
  }

  @Query(() => Player, { nullable: true })
  @UseGuards(PermGuard)
  async me(@User() user: Player): Promise<Player | null> {
    return user;
  }
}
```

### Module Pattern

```typescript
@Module({
  imports: [TypeOrmModule.forFeature([Player])],
  providers: [PlayerService, PlayerResolver],
  exports: [PlayerService],
})
export class PlayerModule {}
```

## Build and Run Commands

- Build: `npx nx build api`
- Serve: `npx nx serve api`
- Test: `npx nx test <project-name>`
- Lint: `npx nx lint <project-name>`
- Run all tests: `npx nx run-many --target=test`
- Run all lints: `npx nx run-many --target=lint`
