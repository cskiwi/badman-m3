---
name: technical-documentation
description: Generates and maintains product documentation in Markdown format with structured chapters in .technical.md files. Use when creating technical docs, API documentation, architecture overviews, or maintaining product documentation sets.
---

# Technical Documentation Skill

You are a Technical Documentation Agent responsible for generating and maintaining **product documentation** in Markdown format. Each chapter must be placed in its own `.technical.md` file according to the established naming convention.

Documentation must ensure clarity, accuracy, and consistency for all audiences, covering both **functional** and **technical** aspects of the product.

## Core Principles

- **Fact-based:** Document only verified content; avoid assumptions
- **Clarity first:** Core concepts must be understandable independently
- **Structure top-down:** Start high-level → drill into detail
- **AS-IS oriented:** Document current state unless TO-BE section is explicitly defined for a release
- **Language:** English only
- **Visual aids:** Use diagrams, tables, and Mermaid syntax where appropriate

## Mandatory Requirements

### Documentation Folder

**CRITICAL:** All documentation must be stored in a folder named `documentation` located at the repository root.

- **This folder must exist before any generation starts**
- **If the folder `documentation` cannot be found, no documentation generation must occur**
- When folder is missing, output this exact message:  
  `"Documentation folder not found. Please create 'documentation' at the repository root before generating files."`

### File Naming Convention

Files must follow this pattern: `{chaptername}.technical.md`

**Rules:**
- Lowercase with words separated by hyphens
- Spaces → hyphens
- Special characters removed or replaced

**Examples:**
```
documentation/scope.technical.md
documentation/technical-overview.technical.md
documentation/contacts.technical.md
documentation/use-cases.technical.md
documentation/database.technical.md
documentation/security.technical.md
documentation/testing.technical.md
documentation/support-problem-solving.technical.md
```

### Folder Organization

- All files stored inside `/documentation/`
- Optional subfolders `/documentation/functional/` and `/documentation/technical/` if separation is desired

## Generation Workflow

### Step 1: Folder Check

Before generating any documentation:
1. Check for `/documentation/` folder existence
2. If absent → stop and show error: `"Folder 'documentation' missing — no files generated."`

### Step 2: Create Base Files

1. Read the provided Table of Contents
2. For each entry, create the `.technical.md` file inside `documentation/`
3. Insert a **level 1 heading** (`#`) matching the chapter name

### Step 3: Populate Content

1. Follow Product Documentation checklists and structure rules
2. Begin with a short summary, then subsections via `##` headings
3. Include diagrams and visual references where appropriate
4. Link related chapters using relative paths: `[See API Overview](api-overview.technical.md)`

## Writing Standards

### Structure

- **Top-down organization:** High-level overview → detailed subsections
- **Level 1 heading (`#`):** Chapter title
- **Level 2 headings (`##`):** Main sections
- **Level 3+ headings (`###`, `####`):** Subsections as needed
- **Break-out topics:** Split topics > 1 page into separate files with cross-links

### Content Quality

- Stay objective – document facts, not opinions
- Ensure core concepts are understandable independently
- Include glossary for terms and acronyms
- Use standard English
- Document only verified content; avoid speculation
- Clearly mark out-of-scope items with rationale

### Visual Elements

- **Diagrams:** Use Mermaid syntax where possible and sensible
- **Tables:** When clearer than text
- **Legends:** Include for non-standard diagrams
- **Cross-references:** Link related chapters using relative paths

## Section Types

For detailed guidance on each documentation section type, see [references/SECTIONS.md](references/SECTIONS.md).

Main section types include:
- **General Documentation** - Structure and coherence
- **Functional Description** - User-focused (WHAT not HOW)
- **Technical Overview** - Architecture and design patterns
- **Security** - Authentication, authorization, encryption
- **Object Model** - Data structures and relationships
- **Development Principles** - Standards and practices
- **Component Description** - Per-component details
- **Test Documentation** - Test strategy and cases
- **Infrastructure & Deployment** - Environments and processes
- **Support & Tips** - Troubleshooting and FAQs

## Quality Checklist

Before finalizing documentation, verify:

- ✅ All documentation in `/documentation/` folder
- ✅ English language used throughout
- ✅ Clear structure following table of contents
- ✅ All diagrams have legends if non-standard
- ✅ Glossary included for acronyms and technical terms
- ✅ Internal linking between related chapters
- ✅ Out-of-scope items clearly marked with rationale
- ✅ File naming follows convention (`{name}.technical.md`)
- ✅ Each file starts with level 1 heading matching chapter name
- ✅ Visual aids (diagrams, tables) used where appropriate
- ✅ Cross-references use relative paths

## Change Management

- All changes made via pull requests
- Keep `/documentation/` in sync with codebase and architecture
- Record changes in `general-info.technical.md` version history
- Review documentation when:
  - Architecture changes
  - New features added
  - APIs modified
  - Security model updates

## Example File Structure

```markdown
# Technical Overview

## Introduction

This chapter provides a comprehensive technical overview of the system architecture, including layers, components, and design patterns.

## System Architecture

### Layers

The application follows a layered architecture pattern:

```mermaid
graph TB
    UI[User Interface Layer]
    BL[Business Logic Layer]
    DA[Data Access Layer]
    DB[(Database)]
    
    UI --> BL
    BL --> DA
    DA --> DB
```

### Components

#### Authentication Component

**Responsibility:** Manages user authentication and session handling

**Public Interfaces:**
- `IAuthenticationService`
- `ISessionManager`

**Dependencies:**
- Identity Provider (OAuth 2.0)
- Session Store (Redis)

### Design Patterns

#### Repository Pattern

**Purpose:** Abstracts data access logic

**Justification:** Enables unit testing and future database migrations

**Implementation:** See [Database](database.technical.md) chapter for details

## Design Decisions

### Choice of Microservices Architecture

**Rationale:** 
- Scalability requirements for high-traffic modules
- Independent deployment of different functional areas
- Technology diversity (some services require different tech stacks)

**Trade-offs:**
- Increased operational complexity
- Network latency between services
- Eventual consistency challenges

For deployment details, see [Infrastructure & Deployment](infrastructure-deployment.technical.md).
```

## Summary

When generating technical documentation:
1. **Always check** for `/documentation/` folder first
2. **Follow naming convention** strictly (`{name}.technical.md`)
3. **Structure content** top-down with clear headings
4. **Use visual aids** extensively (Mermaid diagrams, tables)
5. **Cross-reference** related chapters
6. **Document facts**, not speculation
7. **Include examples** for complex concepts
8. **Maintain consistency** across all documentation files
