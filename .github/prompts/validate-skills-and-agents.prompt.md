---
name: Validate Skills and Agents
description: Perform a comprehensive validation of all skills and agents in this workspace to ensure consistency, correctness, and completeness.
agent: agent
---

# Validate Skills and Agents

Perform a comprehensive validation of all skills and agents in this workspace to ensure consistency, correctness, and completeness.

## Validation Scope

### 1. Skills Validation

For each skill in `.github/skills/`:

#### Structure Validation

- [ ] Each skill directory contains a `SKILL.md` file
- [ ] SKILL.md files have valid YAML frontmatter with opening `---` and closing `---`
- [ ] Frontmatter contains required `name` field (1-64 chars, lowercase letters/numbers/hyphens only)
- [ ] Frontmatter contains required `description` field (1-1024 chars)
- [ ] The `name` in frontmatter matches the folder name exactly
- [ ] Description includes both WHAT the skill does AND WHEN to use it

#### Content Validation

- [ ] SKILL.md has clear "When to Use This Skill" or equivalent section
- [ ] Content is well-structured with proper headings
- [ ] No broken internal links
- [ ] Code examples (if any) are properly formatted
- [ ] No placeholder text like `[TODO]` or `[Fill this in]`

#### Documentation Consistency

- [ ] Skill is listed in `agents.md` with matching name and description
- [ ] Skill is listed in `claude.md` with matching name and description
- [ ] File path in documentation matches actual location

### 2. Agents Validation

For each agent in `.github/agents/`:

#### Structure Validation

- [ ] Agent file has valid YAML frontmatter
- [ ] Frontmatter contains `name` field
- [ ] Frontmatter contains `description` field
- [ ] Frontmatter contains `tools` array (if applicable)
- [ ] File naming follows convention (lowercase with hyphens, `.agent.md` extension)

#### Content Validation

- [ ] Agent has clear role definition
- [ ] Instructions are specific and actionable
- [ ] No contradictory instructions
- [ ] Referenced skills exist in `.github/skills/`
- [ ] Tool restrictions (if any) are valid
- [ ] No placeholder text

#### Documentation Consistency

- [ ] Agent is listed in `agents.md` Available Agents section
- [ ] Agent is listed in `claude.md` Available Custom Agents section
- [ ] Name matches across all references
- [ ] Description matches across all references
- [ ] File path in documentation matches actual location

### 3. Cross-Reference Validation

#### agents.md Validation

- [ ] All skills listed in "Available Skills" section exist in `.github/skills/`
- [ ] All agents listed in "Available Agents" section exist in `.github/agents/`
- [ ] No duplicate entries
- [ ] No orphaned skills (exist on disk but not documented)
- [ ] No orphaned agents (exist on disk but not documented)
- [ ] File paths are correct and workspace-relative

#### claude.md Validation

- [ ] All skills in the skills table exist in `.github/skills/`
- [ ] All agents in the agents table exist in `.github/agents/`
- [ ] Skills table matches `agents.md` content
- [ ] Agents table matches `agents.md` content
- [ ] File paths use correct format (relative paths with `.md` extension)
- [ ] No duplicate entries

#### Synchronization Check

- [ ] agents.md and claude.md have the same list of skills
- [ ] agents.md and claude.md have the same list of agents
- [ ] Descriptions are consistent between both files

### 4. File System Validation

- [ ] No unexpected files in `.github/skills/` directories
- [ ] No unexpected files in `.github/agents/` directory
- [ ] All SKILL.md files use LF line endings (not CRLF)
- [ ] All .agent.md files use LF line endings (not CRLF)
- [ ] agents.md uses LF line endings
- [ ] claude.md uses LF line endings

### 5. Quality Checks

#### Skills Quality

- [ ] Each skill addresses a clear, focused domain
- [ ] No overlap or duplication between skills
- [ ] Skills are appropriately scoped (not too broad, not too narrow)
- [ ] Skills provide actionable guidance, not just theory

#### Agents Quality

- [ ] Each agent has a distinct, non-overlapping role
- [ ] Agent tools are appropriate for their purpose
- [ ] Agent instructions are clear and unambiguous
- [ ] Agents delegate to skills appropriately

## Validation Output

For each validation check:

1. **Report Status**: Pass ✅ or Fail ❌
2. **List Issues**: For failures, provide specific details:
   - File path
   - Issue description
   - Expected vs. actual
   - Recommended fix

3. **Summary Statistics**:
   - Total skills found: X
   - Total agents found: X
   - Skills documented: X/X
   - Agents documented: X/X
   - Total validation checks: X
   - Passed: X
   - Failed: X

4. **Priority Issues**: Highlight critical issues that must be fixed immediately

5. **Recommendations**: Suggest improvements for non-critical issues

## Validation Instructions

Run this validation by:

1. Reading all SKILL.md files in `.github/skills/`
2. Reading all .agent.md files in `.github/agents/`
3. Reading `agents.md` and `claude.md`
4. Comparing and cross-referencing all content
5. Checking file system structure
6. Generating a detailed validation report

**Important**: Do not make any changes during validation. Only report findings. After validation, ask if fixes should be applied.
