# Skill Examples

This reference provides complete examples of well-structured skills across different domains.

## Example 1: Simple Skill (Minimal Structure)

Perfect for straightforward tasks that don't need additional resources.

**Directory structure:**
```
text-formatter/
└── SKILL.md
```

**text-formatter/SKILL.md:**
```markdown
---
name: text-formatter
description: Formats and transforms text using common patterns like title case, snake case, camel case, or removing whitespace. Use when the user asks to format, transform, or clean text.
metadata:
  author: text-tools
  version: "1.0"
---

# Text Formatter

Transforms text using common formatting patterns.

## When to Use

- User asks to format text (title case, uppercase, lowercase)
- Need to convert between naming conventions (camelCase, snake_case, kebab-case)
- Cleaning or normalizing text

## Supported Transformations

### Case Transformations

1. **Title Case:** Capitalize first letter of each word
   - Input: `"hello world"`
   - Output: `"Hello World"`

2. **Upper Case:** All letters uppercase
   - Input: `"hello world"`
   - Output: `"HELLO WORLD"`

3. **Lower Case:** All letters lowercase
   - Input: `"HELLO WORLD"`
   - Output: `"hello world"`

### Naming Conventions

1. **camelCase:** First word lowercase, subsequent words capitalized
   - Input: `"user profile settings"`
   - Output: `"userProfileSettings"`

2. **PascalCase:** All words capitalized
   - Input: `"user profile settings"`
   - Output: `"UserProfileSettings"`

3. **snake_case:** Words separated by underscores, lowercase
   - Input: `"user profile settings"`
   - Output: `"user_profile_settings"`

4. **kebab-case:** Words separated by hyphens, lowercase
   - Input: `"user profile settings"`
   - Output: `"user-profile-settings"`

### Whitespace Operations

1. **Trim:** Remove leading/trailing whitespace
2. **Collapse:** Replace multiple spaces with single space
3. **Remove:** Remove all whitespace

## Workflow

1. **Identify the transformation** needed from user request
2. **Apply the transformation** to the text
3. **Return the result** to the user

## Edge Cases

- **Empty strings:** Return empty string
- **Already formatted:** Still apply transformation (idempotent)
- **Special characters:** Preserve unless specifically asked to remove
- **Numbers:** Handle according to transformation rules
```

---

## Example 2: Medium Complexity (With References)

Good balance of main instructions with detailed reference material.

**Directory structure:**
```
api-documenter/
├── SKILL.md
└── references/
    ├── OPENAPI-SPEC.md
    └── EXAMPLES.md
```

**api-documenter/SKILL.md:**
```markdown
---
name: api-documenter
description: Generates API documentation from code, OpenAPI specs, or existing APIs with examples and usage guides. Use when documenting REST APIs, GraphQL APIs, or creating OpenAPI specifications.
metadata:
  author: api-tools
  version: "2.0"
---

# API Documenter

Generates comprehensive API documentation from various sources.

## When to Use

- User mentions API documentation, OpenAPI, Swagger, or REST API docs
- Need to document endpoints, parameters, or responses
- Creating API reference or usage guides
- Validating or generating OpenAPI/Swagger specifications

## Supported Formats

- **OpenAPI 3.x** - Generate or validate OpenAPI specifications
- **Swagger 2.0** - Legacy Swagger format
- **Markdown** - Human-readable documentation
- **GraphQL** - GraphQL schema documentation

## Workflow

### Step 1: Identify Source

Determine documentation source:
- Existing API code (analyze endpoints)
- OpenAPI/Swagger specification file
- Live API endpoint
- User description

### Step 2: Extract Information

Gather:
- Endpoints (paths, methods)
- Parameters (query, path, body)
- Request/response formats
- Authentication requirements
- Error codes

### Step 3: Generate Documentation

Create documentation with:
- Endpoint descriptions
- Request examples
- Response examples
- Authentication guide
- Error handling

### Step 4: Format Output

Provide documentation in requested format:
- Markdown for readability
- OpenAPI YAML/JSON for specification
- HTML for hosted documentation

## Basic Example

**Input:** API endpoint information
```
POST /api/users
Creates a new user
Body: { "name": string, "email": string }
Returns: { "id": number, "name": string, "email": string }
```

**Output:** Markdown documentation
```markdown
## POST /api/users

Creates a new user account.

### Request

**Method:** POST
**Path:** `/api/users`
**Content-Type:** application/json

**Body:**
```json
{
  "name": "string",
  "email": "string"
}
```

### Response

**Status:** 201 Created
**Content-Type:** application/json

**Body:**
```json
{
  "id": 1,
  "name": "John Doe",
  "email": "john@example.com"
}
```

### Errors

- `400 Bad Request` - Invalid input data
- `409 Conflict` - Email already exists
```

## Advanced Features

For OpenAPI specification details, see [references/OPENAPI-SPEC.md](references/OPENAPI-SPEC.md).

For more complete examples, see [references/EXAMPLES.md](references/EXAMPLES.md).

## Edge Cases

- **Missing information:** Ask user for clarification
- **Complex nested objects:** Break down into components
- **Multiple response types:** Document all variants
- **Authentication:** Include auth requirements prominently
```

---

## Example 3: Complex Skill (Full Structure)

For sophisticated tasks requiring scripts, detailed references, and templates.

**Directory structure:**
```
database-migrator/
├── SKILL.md
├── references/
│   ├── MIGRATION-PATTERNS.md
│   ├── ROLLBACK-STRATEGIES.md
│   └── DATABASE-SUPPORT.md
├── scripts/
│   ├── generate_migration.py
│   ├── validate_migration.py
│   └── rollback.py
└── assets/
    ├── migration-template.sql
    └── rollback-template.sql
```

**database-migrator/SKILL.md:**
```markdown
---
name: database-migrator
description: Creates and manages database migrations with version control, rollback support, and validation. Use when creating database schema changes, migrations, or managing database versions.
metadata:
  author: data-platform
  version: "3.1"
compatibility: Requires Python 3.9+, and database libraries (psycopg2, pymysql, or pymssql)
---

# Database Migrator

Creates, validates, and manages database migrations with full version control.

## When to Use

- Creating database schema changes
- Writing migration scripts
- User mentions migrations, schema changes, or database versioning
- Rolling back database changes
- Validating migration scripts

## Supported Databases

- PostgreSQL
- MySQL/MariaDB
- SQL Server
- SQLite

See [references/DATABASE-SUPPORT.md](references/DATABASE-SUPPORT.md) for version compatibility.

## Quick Start

### Create New Migration

1. **Describe the change** (e.g., "Add email column to users table")
2. **Generate migration** using template
3. **Validate** migration syntax
4. **Generate rollback** script

### Example Workflow

**User request:** "Add an email column to the users table"

**Generated migration (`001_add_email_to_users.sql`):**
```sql
-- Migration: Add email column to users table
-- Version: 001
-- Date: 2026-03-05

BEGIN TRANSACTION;

ALTER TABLE users
ADD COLUMN email VARCHAR(255);

CREATE INDEX idx_users_email ON users(email);

-- Update migration version
INSERT INTO schema_migrations (version, name, applied_at)
VALUES ('001', 'add_email_to_users', CURRENT_TIMESTAMP);

COMMIT;
```

**Generated rollback (`001_add_email_to_users_rollback.sql`):**
```sql
-- Rollback: Add email column to users table
-- Version: 001

BEGIN TRANSACTION;

DROP INDEX IF EXISTS idx_users_email;

ALTER TABLE users
DROP COLUMN email;

-- Remove from migration version
DELETE FROM schema_migrations WHERE version = '001';

COMMIT;
```

## Detailed Workflow

### Step 1: Analyze Change Request

Determine:
- Type of change (ADD, MODIFY, DROP, RENAME)
- Affected tables/columns
- Data type requirements
- Index requirements
- Foreign key relationships

### Step 2: Generate Migration Script

Use template from [assets/migration-template.sql](assets/migration-template.sql):

```bash
python scripts/generate_migration.py \
  --description "Add email to users" \
  --table users \
  --action add-column \
  --column email \
  --type "VARCHAR(255)"
```

### Step 3: Validate Migration

Run validation:

```bash
python scripts/validate_migration.py 001_add_email_to_users.sql
```

Checks:
- SQL syntax
- Transaction boundaries
- Version tracking
- Rollback compatibility

### Step 4: Generate Rollback Script

Automatically create rollback:

```bash
python scripts/generate_migration.py \
  --migration 001_add_email_to_users.sql \
  --generate-rollback
```

### Step 5: Document Migration

Include in migration file:
- Purpose/description
- Dependencies (previous migrations)
- Breaking changes (if any)
- Data migration notes

## Migration Patterns

For complex migrations, see [references/MIGRATION-PATTERNS.md](references/MIGRATION-PATTERNS.md):

- Adding columns with defaults
- Renaming columns/tables
- Splitting tables
- Adding foreign keys to existing data
- Data type changes migration strategies

## Rollback Strategies

See [references/ROLLBACK-STRATEGIES.md](references/ROLLBACK-STRATEGIES.md) for:

- When rollback is safe
- Point-in-time recovery
- Partial rollbacks
- Data preservation during rollback

## Edge Cases

### Breaking Changes

If migration contains breaking changes:
1. Document in migration file header
2. Consider multi-phase migration
3. Plan application code updates
4. Schedule downtime if needed

### Large Data Migrations

For tables with millions of rows:
1. Use batched updates
2. Monitor performance
3. Consider maintenance window
4. Test on production-like dataset

### Multiple Database Support

When targeting multiple database backends:
1. Use generic SQL when possible
2. Create database-specific variants if needed
3. Test on all target databases
4. Document compatibility matrix

## Safety Checklist

Before applying migration:

- [ ] Migration has version number
- [ ] Rollback script exists and tested
- [ ] Transaction boundaries are clear
- [ ] Backup created
- [ ] Tested on development database
- [ ] Peer reviewed
- [ ] Breaking changes documented
- [ ] Application code is compatible

## Examples

See [references/MIGRATION-PATTERNS.md](references/MIGRATION-PATTERNS.md) for:
- Adding NOT NULL constraint safely
- Renaming with zero downtime
- Complex data transformations
- Multi-step migrations
```

---

## Key Takeaways from Examples

### Simple Skills
- Single SKILL.md file is sufficient
- Clear, focused purpose
- Minimal structure
- Direct instructions

### Medium Complexity
- Main workflow in SKILL.md
- Detailed information in references/
- Good balance of accessibility and depth
- One-level reference structure

### Complex Skills
- Full directory structure
- Executable scripts
- Templates and assets
- Comprehensive references
- Still maintains clarity in main SKILL.md

## Choosing the Right Structure

**Use simple structure when:**
- Task is straightforward
- No external dependencies
- Instructions fit comfortably in one file

**Use medium structure when:**
- Task has nuances needing detailed explanation
- Multiple related subtopics
- Examples are extensive

**Use complex structure when:**
- Requires executable code
- Needs templates or assets
- Multiple database/platform support
- Complex workflows with variations

## Common Patterns

Across all examples, notice:
1. **Clear "When to Use" section** - helps agent decide activation
2. **Concrete examples** - shows input→output
3. **Step-by-step workflows** - actionable instructions
4. **Edge cases documented** - handles exceptions
5. **Progressive disclosure** - main SKILL.md stays focused

Use these patterns when create your own skills.
