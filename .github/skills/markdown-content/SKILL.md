---
name: markdown-content
description: Enforces documentation and content creation standards for Markdown files, including formatting, structure, validation, and front matter requirements. Use when creating or editing .md or .mdx files.
---

# Markdown Content Standards

This skill provides comprehensive guidelines for creating and maintaining Markdown documentation files with consistent formatting, proper structure, and validation compliance.

## When to Use This Skill

- Creating or editing Markdown files (`.md`, `.mdx`)
- Writing documentation, README files, or technical content
- Reviewing Markdown content for compliance
- Setting up front matter for documentation pages
- Structuring multi-section documentation

## Core Markdown Content Rules

All Markdown content must follow these foundational rules:

1. **Headings**: Use appropriate heading levels (H2, H3, etc.) to structure content. **Do not use H1** (`#`), as it will be generated from the title in front matter.

2. **Lists**: Use bullet points or numbered lists with proper indentation and spacing.

3. **Code Blocks**: Use fenced code blocks for code snippets with language specification for syntax highlighting.

4. **Links**: Use proper Markdown syntax. Ensure links are valid and accessible.

5. **Images**: Include alt text for accessibility using proper syntax.

6. **Tables**: Format tables properly with alignment and headers.

7. **Line Length**: Limit lines to 120 characters for readability.

8. **Whitespace**: Use appropriate whitespace to separate sections and improve readability.

9. **Front Matter**: Include YAML front matter at the beginning with required metadata fields.

## Formatting and Structure Guidelines

### Headings

- Use `##` for H2 and `###` for H3
- Maintain hierarchical structure
- **Avoid H4 and deeper** - restructure content if needed
- If H5 headings appear necessary, strongly recommend reorganization

**Example:**

```markdown
## Main Section

### Subsection

Content here...

### Another Subsection

More content...
```

### Lists

**Bullet lists:**

- Use `-` for bullet points
- Indent nested lists with two spaces

```markdown
- First item
- Second item
  - Nested item
  - Another nested item
- Third item
```

**Numbered lists:**

- Use `1.` for numbered items
- Indent nested lists with two spaces

```markdown
1. First step
2. Second step
   1. Nested step
   2. Another nested step
3. Third step
```

### Code Blocks

Always use fenced code blocks with language identifiers:

````markdown
```C#
Console.WriteLine("Hello, World!");
```

```typescript
const greeting: string = 'Hello, World!';
console.log(greeting);
```

```json
{
  "name": "example",
  "version": "1.0.0"
}
```
````

### Links

**Inline links:**

```markdown
[Documentation](https://example.com/docs)
```

**Reference-style links** (recommended for repeated URLs):

```markdown
Check out the [docs][documentation] and [API reference][documentation].

[documentation]: https://example.com/docs
```

Place reference link definitions at the end of the document.

### Images

Include descriptive alt text for accessibility:

```markdown
![Architecture diagram showing three-tier application structure](images/architecture.png)

![User login flow](https://example.com/images/login-flow.png)
```

### Tables

Use pipes (`|`) to create tables with proper alignment:

```markdown
| Column 1 | Column 2 | Column 3 |
| -------- | -------- | -------- |
| Value 1  | Value 2  | Value 3  |
| Value 4  | Value 5  | Value 6  |
```

**Alignment options:**

```markdown
| Left | Center | Right |
| :--- | :----: | ----: |
| L1   |   C1   |    R1 |
| L2   |   C2   |    R2 |
```

### Line Length

- **Maximum**: 120 characters per line
- Use soft line breaks for long paragraphs
- Break at natural points (after punctuation, between phrases)

**Example:**

```markdown
This is a long paragraph that exceeds the recommended line length, so it should be
broken into multiple lines at natural points to improve readability and make the
content easier to edit and review.
```

### Whitespace

- Use blank lines to separate sections
- Add blank lines before and after:
  - Headings
  - Code blocks
  - Lists
  - Tables
- Avoid excessive whitespace (more than one blank line)

**Example:**

````markdown
## Section Title

This is the first paragraph with content.

This is the second paragraph after a blank line.

```code
Code block with blank lines before and after
```
````

- List item 1
- List item 2

````

## Front Matter

Include YAML front matter at the beginning of documentation files:

```markdown
---
description: 'Brief description of the document content'
applyTo: ['**/*.md', '**/*.mdx']
---

## Document Content Starts Here
````

**Common front matter fields:**

- `description`: Brief description of the page content
- `title`: Document title (generates H1)
- `applyTo`: File patterns where rules apply
- `author`: Content author
- `date`: Creation or update date
- `tags`: Keywords for categorization

## Validation Requirements

Before committing Markdown files:

1. **Content Rules**: Verify compliance with all markdown content rules
2. **Formatting**: Check proper formatting and structure
3. **Validation Tools**: Run validation tools if configured
4. **Spell Check**: Review spelling and grammar
5. **Links**: Test all links are valid and accessible
6. **Code Blocks**: Verify syntax highlighting and code accuracy

## Common Patterns

### Documentation Header

```markdown
---
description: 'API Reference for Authentication Module'
---

## Overview

This document describes...

## Getting Started

Follow these steps...
```

### Multi-Section Document

```markdown
---
description: 'Complete guide to feature implementation'
---

## Introduction

Brief overview of the feature.

## Prerequisites

- Requirement 1
- Requirement 2

## Implementation

### Step 1: Setup

Instructions for setup...

### Step 2: Configuration

Configuration details...

## Troubleshooting

Common issues and solutions.

## References

[Official Documentation](https://example.com)
```

### API Documentation

````markdown
---
description: 'REST API endpoint reference'
---

## Authentication Endpoints

### POST /api/auth/login

Authenticates a user and returns a JWT token.

**Request:**

```json
{
  "username": "user@example.com",
  "password": "secure_password"
}
```
````

**Response:**

```json
{
  "token": "eyJhbGc...",
  "expiresIn": 3600
}
```

**Status Codes:**

- `200 OK`: Authentication successful
- `401 Unauthorized`: Invalid credentials
- `400 Bad Request`: Missing required fields

````

## Best Practices

### DO

✅ Use consistent heading hierarchy
✅ Include front matter with description
✅ Add language identifiers to code blocks
✅ Keep lines under 120 characters
✅ Use reference-style links for repeated URLs
✅ Add alt text to all images
✅ Include blank lines for separation
✅ Use proper table formatting with headers

### DON'T

❌ Use H1 headings in body content
❌ Exceed 120 characters per line
❌ Skip language identifiers in code blocks
❌ Use inline links repeatedly for the same URL
❌ Omit alt text from images
❌ Create deep heading hierarchies (H5, H6)
❌ Use excessive whitespace
❌ Forget front matter on documentation pages

## Quick Reference

**Headings:**
```markdown
## H2 Heading
### H3 Heading
````

**Lists:**

```markdown
- Bullet item

1. Numbered item
```

**Code:**

````markdown
```language
code here
```
````

**Links:**

```markdown
[text](url)
[text][ref]

[ref]: url
```

**Images:**

```markdown
![alt text](url)
```

**Tables:**

```markdown
| Header | Header |
| ------ | ------ |
| Cell   | Cell   |
```

## Error Prevention

Common issues to avoid:

1. **Missing language in code blocks**: Always specify the language for syntax highlighting
2. **Inconsistent indentation**: Use 2 spaces for nested lists
3. **Long lines**: Break lines at 120 characters
4. **Missing alt text**: Required for accessibility
5. **Deep hierarchies**: Restructure instead of using H4+
6. **H1 in body**: Reserved for title generation
7. **Missing front matter**: Required for proper document rendering
8. **Invalid links**: Test all links before committing
9. **Malformed tables**: Ensure proper pipe alignment
10. **Excessive whitespace**: One blank line is sufficient

## Workflow

When creating or editing Markdown documentation:

1. **Start with front matter** - Add YAML metadata
2. **Plan structure** - Outline sections with H2/H3 headings
3. **Write content** - Follow formatting guidelines
4. **Add code examples** - Use fenced blocks with languages
5. **Include links and images** - With proper syntax and alt text
6. **Format tables** - If needed, with headers and alignment
7. **Check line length** - Break long lines at 120 characters
8. **Validate** - Review against all content rules
9. **Test links** - Ensure all URLs are accessible
10. **Review and commit** - Final check before committing
