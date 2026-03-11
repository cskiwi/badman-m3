# Claude AI Workspace Instructions

Welcome to the badman-m3 project workspace. This file provides guidance for Claude AI (and Claude-based tools like Cline, Cursor) when working in this codebase.

## 📖 Primary Documentation

**Read [AGENTS.md](AGENTS.md) for complete documentation** including:
- Skill-based system architecture
- Available custom agents and skills
- Technology-specific guidelines
- Commit and PR standards
- Development workflows

## Core Architecture

This project uses a **skill-based system**:

```
Agent = Workflow orchestration + Task execution
Skill = Domain knowledge + Best practices
```

**Before implementing any feature:**
1. Read [AGENTS.md](AGENTS.md) for context
2. Consult the relevant skill in `.github/skills/`
3. Follow established patterns and conventions
4. Use custom agents for specialized tasks

## Technology Stack

- **Frontend:** Angular 20+, TypeScript 5.9+, PrimeNG
- **Backend:** NestJS, TypeScript, GraphQL, TypeORM
- **Monorepo:** Nx workspace with apps and libs
- **Documentation:** Markdown with YAML frontmatter
- **Line Endings:** LF (Unix-style) only - never CRLF

## Available Skills

Consult these for domain-specific guidance:

| Skill | Purpose | Location |
|-------|---------|----------|
| **agent-design** | Creating custom agents | [.github/skills/agent-design/SKILL.md](.github/skills/agent-design/SKILL.md) |
| **angular-development** | Angular + PrimeNG patterns | [.github/skills/angular-development/SKILL.md](.github/skills/angular-development/SKILL.md) |
| **nestjs-development** | NestJS backend patterns | [.github/skills/nestjs-development/SKILL.md](.github/skills/nestjs-development/SKILL.md) |
| **make-skill-template** | Creating new skills | [.github/skills/make-skill-template/SKILL.md](.github/skills/make-skill-template/SKILL.md) |
| **markdown-content** | Markdown documentation | [.github/skills/markdown-content/SKILL.md](.github/skills/markdown-content/SKILL.md) |
| **technical-documentation** | Product documentation | [.github/skills/technical-documentation/SKILL.md](.github/skills/technical-documentation/SKILL.md) |
| **write-coding-standards-from-file** | Generate coding standards | [.github/skills/write-coding-standards-from-file/SKILL.md](.github/skills/write-coding-standards-from-file/SKILL.md) |

## Available Custom Agents

This workspace includes specialized agents:

| Agent | Purpose | Location |
|-------|---------|----------|
| **@angular-expert** | Angular features with PrimeNG | [.github/agents/angular-expert.agent.md](.github/agents/angular-expert.agent.md) |
| **@nestjs-expert** | NestJS backend features | [.github/agents/nestjs-expert.agent.md](.github/agents/nestjs-expert.agent.md) |
| **@custom-agent-foundry** | Create new custom agents | [.github/agents/custom-agent-foundry.agent.md](.github/agents/custom-agent-foundry.agent.md) |
| **@specification** | Generate specification documents | [.github/agents/specification.agent.md](.github/agents/specification.agent.md) |

## Quick Reference by File Type

### Angular Files (`*.ts`, `*.component.ts`, `*.html`, `*.scss`)

**Skill:** [angular-development](.github/skills/angular-development/SKILL.md)

**Standards:**
- Use standalone components (no NgModules)
- Use `inject()` for dependency injection
- Use signals for state management (`signal()`, `computed()`, `effect()`)
- Use modern control flow (`@if`, `@for`, `@switch`)
- External templates only (`templateUrl`, never inline)
- TypeScript strict mode enabled

**Before commit:**
```bash
npx nx run-many --target=lint
```

### NestJS / Backend Files (`libs/backend/**/*.ts`)

**Skill:** [nestjs-development](.github/skills/nestjs-development/SKILL.md)

**Standards:**
- Modular architecture (one module per domain)
- Use dependency injection throughout
- DTOs validated with class-validator for inputs
- Entities with TypeORM for data persistence
- Async/await with proper error handling
- One export per file

**Before commit:**
```bash
npx nx run-many --target=lint
npx nx run-many --target=test
```

### Markdown Files (`*.md`, `*.mdx`)

**Skill:** [markdown-content](.github/skills/markdown-content/SKILL.md)

**Standards:**
- Include YAML frontmatter
- Start content with H2 (not H1)
- Code blocks with language specification
- Limit lines to 120 characters
- LF line endings only

### Technical Documentation (`*.technical.md`)

**Skill:** [technical-documentation](.github/skills/technical-documentation/SKILL.md)

**Standards:**
- Must be in `/documentation` folder
- Structured chapters with frontmatter
- Fact-based, AS-IS oriented
- Include Mermaid diagrams where appropriate

## Commit Message Standards

Use **Conventional Commits** format:

```
<type>(<scope>): <description>

Examples:
feat(auth): add JWT token refresh mechanism
fix(ranking): correct date formatting in grid
docs(api): update authentication endpoints
refactor(services): extract common HTTP logic
chore(deps): update Angular to v20
```

**Rules:**
- Limit lines to 100 characters
- Use lowercase for type and scope
- Write in imperative mood ("add" not "added")
- Do NOT commit plans or progress updates separately
- Include planning details in PR description

**Valid types:** `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

## Development Workflow

When implementing features:

1. **Understand** - Read requirements and acceptance criteria
2. **Research** - Use semantic search to find similar patterns
3. **Consult** - Read the appropriate skill for domain guidance
4. **Plan** - Break down into actionable steps (mental or todo list)
5. **Implement** - Follow skill guidelines and project conventions
6. **Test** - Run linters, formatters, and tests
7. **Commit** - Use conventional commit format
8. **PR** - Include context and planning in PR description

## When to Suggest Custom Agents

If the user's request falls into these categories, **recommend the appropriate agent**:

- Complex Angular features → Suggest `@angular-expert`
- Complex NestJS features → Suggest `@nestjs-expert`
- Creating technical specs → Suggest `@specification`
- Creating new agents → Suggest `@custom-agent-foundry`

## Architecture Principles

### Code Quality
- Extract complex logic into helper functions
- Use guard clauses and early returns
- Follow SOLID principles
- Implement proper error handling
- Write clear, concise comments

### Performance
- Throttle frequent operations in hot paths
- Use lazy loading where appropriate
- Optimize queries and data fetching
- Profile before optimizing

### Maintainability
- Keep components/classes focused (single responsibility)
- Use dependency injection
- Separate concerns by layer
- Write self-documenting code with meaningful names

## File Organization

```
badman-m3/
├── .github/
│   ├── agents/              # Custom agents
│   ├── instructions/        # Code instructions
│   ├── skills/              # Domain knowledge
│   └── workflows/           # CI/CD workflows
├── apps/                    # Application projects
│   ├── api/                 # NestJS API
│   ├── app/                 # Angular frontend
│   └── sync-worker/         # Background worker
├── libs/                    # Shared libraries
│   ├── backend/             # NestJS backend libs
│   ├── frontend/            # Angular frontend libs
│   ├── models/              # Shared models
│   ├── shared/              # Shared utilities
│   └── utils/               # Utility functions
├── AGENTS.md                # Complete documentation
├── CLAUDE.md                # This file
└── nx.json                  # Nx configuration
```

## Important Reminders

✅ **Always:**
- Use LF line endings (never CRLF)
- Consult skills before implementing
- Follow existing patterns in codebase
- Run linters and formatters before committing
- Use conventional commit format
- Use Nx to run tasks (`npx nx run`, `npx nx run-many`)

❌ **Never:**
- Use CRLF line endings
- Create NgModules in Angular (use standalone)
- Commit without linting/formatting
- Commit plans as separate commits
- Ignore skill guidelines
- Run tasks directly instead of through Nx

# important-instruction-reminders

Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (\*.md) or README files. Only create documentation files if explicitly requested by the User.
Never save working files, text/mds and tests to the root folder.

---

**For complete documentation, always refer to [AGENTS.md](AGENTS.md)**

<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

## General Guidelines for working with Nx

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
