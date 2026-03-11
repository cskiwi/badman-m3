<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

# General Guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first - it has patterns for querying projects, targets, and dependencies
- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- Prefix nx commands with the workspace's package manager (e.g., `pnpm nx build`, `npm exec nx test`) - avoids using globally installed CLI
- You have access to the Nx MCP server and its tools, use them to help the user
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md`. Not all plugins have this file - proceed without it if unavailable.
- NEVER guess CLI flags - always check nx_docs or `--help` first when unsure

## Scaffolding & Generators

- For scaffolding tasks (creating apps, libs, project structure, setup), ALWAYS invoke the `nx-generate` skill FIRST before exploring or calling MCP tools

## When to use nx_docs

- USE for: advanced config options, unfamiliar flags, migration guides, plugin configuration, edge cases
- DON'T USE for: basic generator syntax (`nx g @nx/react:app`), standard commands, things you already know
- The `nx-generate` skill handles generator discovery internally - don't call nx_docs just to look up generator syntax

<!-- nx configuration end-->

# Agent Instructions

This project uses a **skill-based system** to provide domain-specific guidance for development tasks. When working on specific technologies or patterns, consult the appropriate skill for detailed instructions.

> **Note:**
> - For **GitHub Copilot** users, this documentation is automatically loaded
> - For **Claude AI** users (Cline, Cursor, etc.), see [CLAUDE.md](CLAUDE.md) for quick reference

## General File Creation Guidelines

When creating new files:

- **Always use LF (Unix-style) line endings**, not CRLF (Windows-style)
- This repository uses `.gitattributes` to enforce LF line endings
- Ensures consistency across all platforms and avoids Git warnings

## Angular

When working with Angular files (`*.ts`, `*.component.ts`, `*.service.ts`, `*.html`, `*.scss`):

- **Consult the `.github/skills/angular-development/SKILL.md` skill** for comprehensive guidance on:
  - PrimeNG component integration and discovery
  - Project-specific Angular patterns
  - Form handling with PrimeNG and reactive forms
  - State management with signals
  - Service layer patterns and HTTP handling
- Follow Angular style guide and best practices
- Use TypeScript strict mode
- Implement proper component lifecycle hooks
- Follow reactive programming patterns with RxJS
- Before committing, ensure code is formatted and linted:
  - Run `npx nx run-many --target=lint` and address findings

## NestJS / Backend

When working with NestJS and backend files (`libs/backend/**/*.ts`, `apps/api/**/*.ts`):

- **Consult the `.github/skills/nestjs-development/SKILL.md` skill** for comprehensive guidance on:
  - Modular architecture and clean design
  - GraphQL resolvers and schema design
  - TypeORM entities and data persistence
  - Dependency injection patterns
  - DTOs with class-validator
  - Guards, interceptors, and middleware
- Follow NestJS conventions and naming standards
- Use modern TypeScript features
- Ensure proper async/await usage
- Before committing:
  - Run `npx nx run-many --target=lint` to ensure consistent formatting
  - Run `npx nx run-many --target=test` to ensure tests pass

## Architecture and Design

When working on code that impacts performance, maintainability, or system design:

- Key principles: extract complex logic into helpers, use guard clauses and early returns, throttle frequent operations in hot paths
- Follow SOLID principles
- Use dependency injection throughout
- Separate concerns by layer

## Markdown

When editing Markdown files (`*.md`, `*.mdx`):

- **Consult the `.github/skills/markdown-content/SKILL.md` skill** for:
  - Documentation and content creation standards
  - Formatting and structure guidelines
  - Front matter requirements
  - Validation and best practices

## Technical Documentation

When creating or maintaining product documentation:

- **Consult the `.github/skills/technical-documentation/SKILL.md` skill** for:
  - Structured documentation format in `.technical.md` files
  - Chapter organization and frontmatter structure
  - API documentation standards
  - Architecture overview patterns

## Creating New Skills

When creating new skills for this repository:

- **Consult the `.github/skills/make-skill-template/SKILL.md` skill** for:
  - Official Agent Skills format specification
  - Skill structure and validation
  - Best practices for skill creation
  - Examples and validation checklist

## Commit and Pull Request Guidelines

- Use [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/#summary) for PR titles and commit messages
- Follow Angular commit message format:
  - `feat(scope): description` - new feature
  - `fix(scope): description` - bug fix
  - `docs(scope): description` - documentation changes
  - `style(scope): description` - formatting, no code change
  - `refactor(scope): description` - code refactoring
  - `test(scope): description` - adding/updating tests
  - `chore(scope): description` - maintenance tasks
- Limit commit message lines to a maximum of 100 characters
- **Do not commit initial plans or progress updates as separate commits**
  - Include planning information in the PR description instead

Examples:

- `feat(auth): add JWT token refresh mechanism`
- `fix(ranking): correct date formatting in grid`
- `docs(api): update authentication endpoints documentation`
- `refactor(services): extract common HTTP logic to base service`
- `chore(deps): update Angular to v20`

## Available Skills

Current skills in this repository:

- **agent-design** - Expert guidance for designing VS Code custom agents with optimal tool selection, instruction writing, workflow integration, and best practices. Use when creating or improving custom agents.
- **angular-development** - Angular development patterns using PrimeNG components. Use when building Angular features, components, forms, or UI elements in this project.
- **nestjs-development** - NestJS backend development patterns with GraphQL, TypeORM, and modular architecture. Use when building backend features, APIs, or services in this project.
- **make-skill-template** - Create new Agent Skills for GitHub Copilot from prompts or by duplicating this template. Use when asked to "create a skill", "make a new skill", "scaffold a skill", or when building specialized AI capabilities with bundled resources. Generates SKILL.md files with proper frontmatter, directory structure, and optional scripts/references/assets folders.
- **markdown-content** - Enforces documentation and content creation standards for Markdown files, including formatting, structure, validation, and front matter requirements. Use when creating or editing .md or .mdx files.
- **technical-documentation** - Generates and maintains product documentation in Markdown format with structured chapters in .technical.md files. Use when creating technical docs, API documentation, architecture overviews, or maintaining product documentation sets.
- **write-coding-standards-from-file** - Write a coding standards document for a project using the coding styles from the file(s) and/or folder(s) passed as arguments in the prompt.

## Available Agents

Current agents in this repository:

- **angular-expert** - Implements Angular features following modern Angular 20+ patterns with PrimeNG and TypeScript best practices.
- **nestjs-expert** - Implements NestJS backend features following modular architecture, GraphQL, TypeORM, and TypeScript best practices.
- **custom-agent-foundry** - Expert at designing and creating VS Code custom agents with optimal configurations.
- **specification** - Generate or update specification documents for new or existing functionality.
