---
name: Migrate Frontend
description: Fully migrate the Angular frontend project to the latest Angular, PrimeNG, and @ambe-web-framework versions
agent: Frontend Migrator
---

Perform a complete frontend migration of this project to the latest compatible Angular, PrimeNG, and @ambe-web-framework versions.

## Instructions

1. **Analyze the project** — Read `package.json` and scan all source files to determine the current Angular version, UI framework (Material vs PrimeNG), and whether @ambe-web-framework is already in use.

2. **Pick the correct migration path:**
   - If the project is on Angular 14+ and already uses PrimeNG → use the **npm-package-migration** skill for an incremental upgrade.
   - If the project is on Angular < 14, uses Angular Material, or uses the old framework → use the **legacy-angular-migration** skill for a full migration.

3. **Migrate every feature** — Do not stop after upgrading packages. Walk through every component, service, and template in every feature folder. Replace all Angular Material components with PrimeNG equivalents. Convert all NgModules to standalone. Modernize all TypeScript (inject, signals, outputs).

4. **Run all Angular CLI modernizations** on the full codebase:
   - `@angular/core:control-flow`
   - `@angular/core:inject`
   - `@angular/core:route-lazy-loading`
   - `@angular/core:signal-input-migration`
   - `@angular/core:output-migration`
   - `@angular/core:signal-queries-migration`
   - `@angular/core:cleanup-unused-imports`
   - `@angular/core:self-closing-tag`

5. **Validate the result:**
   - Build must succeed with zero errors
   - Lint must pass
   - No Angular Material imports (`@angular/material`) remain
   - No legacy patterns (`*ngIf`, `*ngFor`, constructor injection, NgModules) remain
   - All features function correctly

6. **Commit** each phase using conventional commits (e.g., `feat(migration): upgrade Angular to v20`, `refactor(templates): replace Material with PrimeNG`).
