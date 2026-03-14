# Validation Checklist Reference

Use this checklist when creating or validating Agent Skills.

## Pre-Creation Checklist

Before starting to create a skill:

- [ ] Identified clear use case and domain
- [ ] Determined when the skill should be activated
- [ ] Chosen a descriptive, specific name (lowercase, hyphens only)
- [ ] Verified name doesn't conflict with existing skills
- [ ] Decided what content goes in SKILL.md vs references/

## YAML Frontmatter Validation

### Required Fields

- [ ] `name` field present
- [ ] `name` is 1-64 characters
- [ ] `name` contains only lowercase letters, numbers, and hyphens
- [ ] `name` does not start with a hyphen
- [ ] `name` does not end with a hyphen
- [ ] `name` does not contain consecutive hyphens (`--`)
- [ ] `name` matches parent directory name exactly
- [ ] `description` field present
- [ ] `description` is 1-1024 characters
- [ ] `description` describes what the skill does
- [ ] `description` describes when to use the skill
- [ ] `description` includes relevant keywords for agent discovery

### Optional Fields (if used)

- [ ] `license` field is brief and clear
- [ ] `compatibility` field is 1-500 characters (if present)
- [ ] `compatibility` only included if there are actual environment requirements
- [ ] `metadata` keys are reasonably unique
- [ ] `metadata` values are strings
- [ ] `allowed-tools` format is correct (if experimental feature is used)

## Directory Structure Validation

- [ ] Main directory name matches `name` field
- [ ] `SKILL.md` file exists in skill root
- [ ] If using `scripts/` directory, scripts are documented
- [ ] If using `references/` directory, files are focused and topic-specific
- [ ] If using `assets/` directory, assets are necessary and referenced
- [ ] No deeply nested directory structures (keep flat)

## SKILL.md Content Validation

### Structure

- [ ] YAML frontmatter is properly formatted (starts and ends with `---`)
- [ ] Frontmatter is followed by Markdown body
- [ ] File is under 500 lines (or has good reason to be longer)
- [ ] Content is organized with clear headings
- [ ] Sections flow logically

### Content Quality

- [ ] Introduction explains what the skill does
- [ ] "When to Use" section clearly defines activation triggers
- [ ] Step-by-step instructions are actionable
- [ ] Instructions use imperative language (do X, then Y)
- [ ] Examples are included with concrete input/output
- [ ] Edge cases and common issues are documented
- [ ] Language is clear and unambiguous
- [ ] Technical jargon is explained or avoided

### Examples

- [ ] At least one complete example is provided
- [ ] Examples show actual input data/format
- [ ] Examples show expected output
- [ ] Examples demonstrate the most common use case
- [ ] Complex cases have additional examples
- [ ] Examples are realistic and practical

### Progressive Disclosure

- [ ] Main workflow is in SKILL.md
- [ ] Detailed technical content moved to references/ (if applicable)
- [ ] File references use relative paths
- [ ] Reference chains are one level deep (no A→B→C→D chains)
- [ ] Each reference file has a clear, specific purpose

## File References Validation

- [ ] All file references use relative paths from skill root
- [ ] Referenced files actually exist
- [ ] File paths are correct (case-sensitive on some systems)
- [ ] Links to references/ are justified (content is detailed enough to warrant separate file)
- [ ] Links to scripts/ are documented with usage examples
- [ ] Links to assets/ are necessary for the skill

## Scripts Validation (if applicable)

- [ ] Scripts have clear documentation header
- [ ] Script usage is explained (parameters, options)
- [ ] Dependencies are documented
- [ ] Error messages are helpful and actionable
- [ ] Scripts handle edge cases gracefully
- [ ] Script language/runtime is commonly available
- [ ] Example usage is provided in SKILL.md

## References Validation (if applicable)

- [ ] Each reference file has a single, clear purpose
- [ ] Reference files are under 1000 lines each
- [ ] Content in references is actually detailed/extensive enough to justify separate file
- [ ] References are cross-linked appropriately
- [ ] Reference file names are descriptive

## Assets Validation (if applicable)

- [ ] Assets are actually needed (not redundant)
- [ ] Asset file names are descriptive
- [ ] Assets are referenced from SKILL.md or references/
- [ ] File sizes are reasonable (not excessively large)
- [ ] Asset formats are widely supported

## Quality Checks

### Clarity

- [ ] Instructions can be followed without ambiguity
- [ ] Technical assumptions are stated explicitly
- [ ] Prerequisites are clearly listed
- [ ] Success criteria are defined
- [ ] Failure modes are documented

### Completeness

- [ ] All necessary steps are included
- [ ] Common questions are anticipated and answered
- [ ] Edge cases are covered
- [ ] Error handling is explained
- [ ] Alternative approaches are mentioned (if applicable)

### Consistency

- [ ] Terminology is consistent throughout
- [ ] Code style is consistent in examples
- [ ] File references use consistent format
- [ ] Heading levels are used consistently
- [ ] Examples follow the same structure

### Usability

- [ ] Agent can understand when to activate this skill
- [ ] Agent can follow the instructions successfully
- [ ] Examples are sufficient to understand the pattern
- [ ] Edge cases won't cause the agent to get stuck
- [ ] Error recovery is possible

## Common Issues Checklist

Check for these common mistakes:

- [ ] ❌ Name has uppercase letters
- [ ] ❌ Name starts or ends with hyphen
- [ ] ❌ Name has consecutive hyphens
- [ ] ❌ Name doesn't match directory
- [ ] ❌ Description is vague or too short
- [ ] ❌ Description doesn't mention when to use it
- [ ] ❌ Description lacks keywords for discovery
- [ ] ❌ SKILL.md is excessively long (>500 lines) without justification
- [ ] ❌ Instructions are vague or use passive voice
- [ ] ❌ No examples provided
- [ ] ❌ Examples lack input or output
- [ ] ❌ File references use absolute paths
- [ ] ❌ Deep reference chains (A→B→C)
- [ ] ❌ Scripts lack documentation
- [ ] ❌ Edge cases not documented
- [ ] ❌ Duplicate content across multiple files
- [ ] ❌ Unnecessary files included

## Final Review

Before considering the skill complete:

- [ ] Read through SKILL.md as if you're seeing it for the first time
- [ ] Verify all examples actually work
- [ ] Check that file references resolve correctly
- [ ] Ensure the skill has a clear, specific purpose
- [ ] Confirm the skill doesn't duplicate existing skills
- [ ] Test that the workflow is actionable
- [ ] Verify progressive disclosure is used effectively
- [ ] Ensure the description will help agents discover this skill

## Validation Commands

If available, use validation tools:

```bash
# Using skills-ref reference library (if available)
skills-ref validate ./path/to/skill-name

# Manual file structure check
ls -R ./path/to/skill-name

# Check YAML frontmatter syntax
head -n 10 ./path/to/skill-name/SKILL.md

# Count lines in SKILL.md
wc -l ./path/to/skill-name/SKILL.md
```

## Sign-off Checklist

Final verification before publishing:

- [ ] All required validation checks pass
- [ ] Content reviewed by at least one other person (peer review)
- [ ] Examples tested and verified working
- [ ] Documentation is clear and complete
- [ ] No known issues or TODOs remaining
- [ ] Version number updated (if applicable)
- [ ] Changes documented (if updating existing skill)

---

Use this checklist systematically to ensure your skills meet the Agent Skills specification requirements.
