---
name: agent-design
description: Expert guidance for designing VS Code custom agents with optimal tool selection, instruction writing, workflow integration, and best practices. Use when creating or improving custom agents.
---

# Agent Design

Provides comprehensive guidance for designing and creating effective VS Code custom agents with optimal configurations, tool selection, and workflow integration patterns.

## When to Use

- Designing a new custom agent
- Reviewing or improving existing agent configurations
- Selecting appropriate tools for agent capabilities
- Writing agent instructions and guidelines
- Planning workflow handoffs between agents
- User asks about agent architecture or best practices
- Optimizing agent performance and effectiveness

## Agent Design Fundamentals

### Agent vs Skill Architecture

**Modern Pattern: Skills over Instructions**

```
Agent = Workflow orchestration + Task execution
Skill = Domain knowledge + Best practices
```

**When to Create an Agent:**

- Specific role-based workflow (e.g., security reviewer, planner, test writer)
- Orchestrates tasks with tool execution
- Needs specific tool access (edit, execute, web fetch)
- Part of a handoff workflow chain

**When to Create a Skill:**

- Domain-specific knowledge (e.g., PrimeNG, .NET, Azure)
- Best practices and patterns
- Reference documentation
- Reusable across multiple agents

**Best Practice:**

- Keep agents concise (< 100 lines)
- Move domain knowledge to skills
- Agents reference skills, not duplicate them

### Requirements Gathering

Before designing an agent, understand:

1. **Role/Persona**: What specialized role should this agent embody?
   - Examples: Security Reviewer, API Planner, Test Writer, Documentation Generator
   - Define clear boundaries and responsibilities

2. **Primary Tasks**: What specific tasks will this agent handle?
   - List concrete, actionable tasks
   - Identify task sequences and dependencies
   - Consider task frequency and complexity

3. **Tool Requirements**: What capabilities does it need?
   - Read-only vs editing capabilities
   - Web access for documentation lookup
   - Terminal execution for builds/tests
   - MCP server integration

4. **Constraints**: What should it NOT do?
   - Safety boundaries (e.g., don't delete files without confirmation)
   - Scope limitations (e.g., review only, don't implement)
   - Security constraints (e.g., no credential handling)

5. **Workflow Integration**: Will it work standalone or as part of a chain?
   - Standalone agent (complete task independently)
   - Workflow chain (hand off to other agents)
   - Trigger conditions (when to activate)

6. **Target Users**: Who will use this agent?
   - Affects complexity and terminology
   - Determines level of explanation needed
   - Influences output format

## Tool Selection Strategy

### Tool Categories

#### Read-Only Tools (Research & Analysis Agents)

```yaml
tools: ['read', 'search', 'web/fetch', 'github/repo']
```

**Use for:**

- Planning agents
- Research agents
- Review/analysis agents
- Documentation discovery agents

**Examples:**

- `read_file` - Read workspace files
- `semantic_search` - Find relevant code
- `grep_search` - Text search in files
- `file_search` - Find files by pattern
- `web/fetch` - Fetch external documentation
- `list_dir` - Browse directory structure

#### Editing Tools (Implementation Agents)

```yaml
tools: ['read', 'edit', 'search']
```

**Use for:**

- Code implementation agents
- Refactoring agents
- File modification agents

**Examples:**

- `replace_string_in_file` - Edit existing files
- `multi_replace_string_in_file` - Batch edits
- `create_file` - Create new files

#### Execution Tools (Build & Test Agents)

```yaml
tools: ['read', 'execute', 'search']
```

**Use for:**

- Testing agents
- Build/deployment agents
- Command execution agents

**Examples:**

- `run_in_terminal` - Execute commands
- `get_terminal_output` - Check command results
- `get_errors` - Check compilation/lint errors

#### Web Tools (Documentation Agents)

```yaml
tools: ['web', 'read', 'search']
```

**Use for:**

- Documentation lookup agents
- API research agents
- External resource integration

**Examples:**

- `web/fetch` - Fetch web content
- External documentation access

#### MCP Integration

```yaml
tools: ['mcp_server_name/*', 'read', 'search']
```

**Use for:**

- Domain-specific tool access (e.g., PrimeNG, Azure, GitHub)
- Specialized API integrations

**Examples:**

- `github/*` - GitHub operations
- `mcp_primeng_*` - PrimeNG component tools
- `mcp_azure_*` - Azure service tools

#### Combined Tool Strategies

**Full-Stack Agent:**

```yaml
tools: ['vscode', 'read', 'edit', 'execute', 'search', 'web', 'github/*']
```

**Focused Review Agent:**

```yaml
tools: ['read', 'search', 'web/fetch']
```

**Implementation Agent:**

```yaml
tools: ['read', 'edit', 'search', 'execute']
```

### Tool Permission Formats

**Both short-form and long-form tool permissions are valid.** There is no strict rule - choose the format that best fits your agent's needs.

#### Short-Form Permissions (Broader Access)

```yaml
tools: ['read', 'edit', 'search', 'execute', 'web']
```

**Characteristics:**

- Grants broader access to tool categories
- Simpler and more concise
- Agent has access to all tools within the category
- Easier to maintain

**Examples:**

- `execute` → Grants access to all execution tools (runCommands, runTasks, runTests, terminal operations)
- `web` → Grants access to all web tools (web/fetch, openSimpleBrowser)
- `search` → Grants access to all search tools (search/codebase, search/searchResults, semantic_search, grep_search)

#### Long-Form Permissions (Granular Access)

```yaml
tools: ['changes', 'search/codebase', 'edit/editFiles', 'runCommands', 'runTasks', 'web/fetch', 'openSimpleBrowser']
```

**Characteristics:**

- Grants specific, granular permissions
- More explicit about capabilities
- Limits agent to specific tools within a category
- Provides finer control over capabilities

**Examples:**

- `runCommands`, `runTasks`, `runTests` → Specific execution capabilities
- `web/fetch`, `openSimpleBrowser` → Specific web capabilities
- `search/codebase`, `search/searchResults` → Specific search capabilities

#### Choosing the Right Format

**Use Short-Form When:**

- Agent needs flexible access to a category of tools
- Simplicity and maintainability are priorities
- Agent's scope is well-defined and trustworthy
- You want the agent to automatically benefit from new tools in the category

**Use Long-Form When:**

- Agent should be restricted to specific capabilities
- Security or safety requires granular control
- Agent's responsibilities are highly specialized
- You want explicit documentation of exact capabilities

**Mixed Format (Also Valid):**

```yaml
tools: ['read', 'edit', 'search', 'runCommands', 'web/fetch', 'github/*']
```

You can mix short-form and long-form permissions as needed. There is no requirement to use one format exclusively.

### Tool Selection Best Practices

1. **Minimal Necessary Tools**: Only include tools the agent actually needs
2. **Progressive Permissions**: Start restrictive, add tools as needed
3. **Safety First**: Avoid execution tools for review-only agents
4. **Clear Justification**: Document why each tool is needed
5. **Format Flexibility**: Choose short-form, long-form, or mixed based on your agent's needs

## Agent File Structure

### YAML Frontmatter

```yaml
---
description: Brief, clear description shown in chat input (required)
name: Display name for the agent (optional, defaults to filename)
argument-hint: Guidance text for users on how to interact (optional)
tools: ['tool1', 'tool2', 'toolset/*'] # Available tools
model: Claude Sonnet 4.5 # Optional: specific model selection
handoffs: # Optional: workflow transitions
  - label: Next Step
    agent: target-agent-name
    prompt: Pre-filled prompt text
    send: false
---
```

**Frontmatter Fields:**

- **description** (required): Brief description shown in UI
  - 50-200 characters ideal
  - Describe what the agent does
  - Include trigger keywords
- **name** (optional): Display name
  - Defaults to filename without `.agent.md`
  - Use for clearer UI presentation
- **argument-hint** (optional): User guidance
  - Shows below agent name in UI
  - Example: "Describe the component to build"
- **tools** (required): Array of available tools
  - Use short-form (broad): `read`, `edit`, `execute`, `search`, `web`
  - Use long-form (granular): `runCommands`, `runTasks`, `web/fetch`, `search/codebase`
  - Mix formats as needed - both are valid
  - Use wildcards for MCP: `github/*`, `mcp_primeng_*`
  - See **Tool Permission Formats** section for detailed guidance
- **model** (optional): Specific model selection
  - Example: `Claude Sonnet 4.5`
  - Omit to use default model
- **handoffs** (optional): Workflow transitions
  - Define next steps in workflow
  - Include agent name, label, pre-filled prompt

### Body Content Structure

**Recommended Sections:**

1. **Identity & Purpose** (1-3 lines)

   ```markdown
   You are a [Role] specialized in [Domain].
   Your purpose is to [Primary Goal].
   ```

2. **When to Invoke** (bullet list)
   - Clear activation triggers
   - Specific use cases
   - Keywords that identify relevant tasks

3. **Core Workflow** (numbered steps)
   - Step-by-step execution process
   - Tool usage patterns
   - Decision points

4. **Reference Skills** (links to skills)

   ```markdown
   For [domain] best practices, consult [skill-name](../skills/skill-name/SKILL.md).
   ```

5. **Constraints** (bullet list)
   - What NOT to do
   - Safety boundaries
   - Scope limitations

6. **Output Specifications** (optional)
   - Expected output format
   - Quality standards
   - Deliverable examples

**Keep it Concise:**

- Target: < 100 lines for agent file
- Move domain knowledge to skills
- Focus on workflow, not detailed knowledge

## Instruction Writing Best Practices

### Clear Identity Statement

✅ **Good:**

```markdown
You are a Security Reviewer specialized in identifying vulnerabilities in web applications.
Your purpose is to analyze code for security issues and provide actionable remediation guidance.
```

❌ **Poor:**

```markdown
You help with security stuff.
```

### Imperative Language

✅ **Good:**

```markdown
Before implementing changes:

1. **Always** review existing patterns in the codebase
2. **Never** modify files without understanding their purpose
3. **Must** verify tests pass after changes
```

❌ **Poor:**

```markdown
It's good to review patterns and maybe verify tests.
```

### Concrete Examples

✅ **Good:**

```markdown
## Output Format

Provide a security report with:

**Critical Issues:**

- [FILE:LINE] SQL injection vulnerability in user input handling
  - Risk: High
  - Remediation: Use parameterized queries

**Warnings:**

- [FILE:LINE] Missing CSRF token validation
  - Risk: Medium
  - Remediation: Add CSRF middleware
```

❌ **Poor:**

```markdown
Find security issues and report them.
```

### Explicit Behavior Specifications

**Use specific, measurable behaviors:**

✅ **Good:**

```markdown
When reviewing authentication code:

1. Verify password hashing uses bcrypt with cost factor ≥ 12
2. Check JWT tokens include expiration claims
3. Ensure refresh tokens are single-use
4. Validate rate limiting on login endpoints (≤ 5 attempts/15min)
```

❌ **Poor:**

```markdown
Check authentication is secure.
```

## Workflow Integration

### Handoff Patterns

**Sequential Workflow:**

```yaml
handoffs:
  - label: Implement Plan
    agent: implementation-agent
    prompt: "Implement the following plan:\n\n{{previous_output}}"
    send: false
```

**Conditional Handoff:**

```yaml
handoffs:
  - label: Fix Issues
    agent: fix-agent
    prompt: "Fix the following issues:\n\n{{issues}}"
    send: false
  - label: Approve & Deploy
    agent: deploy-agent
    prompt: 'Deploy the reviewed code'
    send: false
```

**Review Loop:**

```yaml
handoffs:
  - label: Revise Based on Feedback
    agent: implementation-agent
    prompt: "Address the following review comments:\n\n{{review_feedback}}"
    send: false
  - label: Mark Complete
    agent: documentation-agent
    prompt: 'Document the implemented feature'
    send: false
```

### Handoff Best Practices

1. **Descriptive Labels**: Use action-oriented button text
   - ✅ "Implement Security Fixes"
   - ❌ "Next"

2. **Context Preservation**: Pre-fill prompts with relevant context

   ```yaml
   prompt: "Implement:\n\n{{plan}}\n\nConstraints:\n{{constraints}}"
   ```

3. **User Review Points**: Use `send: false` when user should review

   ```yaml
   send: false # User can edit prompt before sending
   ```

4. **Automated Flow**: Use `send: true` for automated transitions

   ```yaml
   send: true # Automatically proceeds to next agent
   ```

5. **Multiple Options**: Provide alternative paths
   ```yaml
   handoffs:
     - label: Auto-Fix Issues
       agent: fixer
       send: false
     - label: Manual Review
       agent: reviewer
       send: false
   ```

## Common Agent Archetypes

### Planner Agent

**Purpose:** Research, analyze, create implementation plans

**Tools:**

```yaml
tools: ['read', 'search', 'web/fetch', 'github/repo']
```

**Pattern:**

```markdown
You are a Technical Planner specialized in breaking down features into actionable tasks.

## Workflow

1. Understand requirements through questions
2. Research existing codebase patterns
3. Identify dependencies and constraints
4. Create detailed, step-by-step implementation plan
5. Hand off to implementation agent

## Output Format

- **Overview**: Feature summary
- **Tasks**: Numbered implementation steps
- **Dependencies**: Required components/libraries
- **Risks**: Potential issues and mitigations
```

**Handoff:**

```yaml
handoffs:
  - label: Implement Plan
    agent: implementation-agent
    send: false
```

### Implementation Agent

**Purpose:** Write code, refactor, apply changes

**Tools:**

```yaml
tools: ['read', 'edit', 'search', 'execute']
```

**Pattern:**

```markdown
You are a Code Implementer specialized in writing clean, tested code.

## Workflow

1. Review implementation plan or requirements
2. Check existing patterns in codebase
3. Implement changes following project conventions
4. Run tests to verify correctness
5. Hand off to review agent

## Constraints

- Follow existing code style and patterns
- Write tests for new functionality
- Never skip error handling
```

**Handoff:**

```yaml
handoffs:
  - label: Review Implementation
    agent: review-agent
    send: false
  - label: Run Tests
    agent: test-agent
    send: true
```

### Review Agent

**Purpose:** Analyze code quality, security, performance

**Tools:**

```yaml
tools: ['read', 'search', 'web/fetch']
```

**Pattern:**

```markdown
You are a Code Reviewer specialized in quality and security analysis.

## Workflow

1. Read modified files
2. Check for common issues (security, performance, style)
3. Compare against project standards
4. Generate detailed review report
5. Suggest improvements or approve

## Output Format

**Critical Issues:** (must fix)
**Warnings:** (should fix)
**Suggestions:** (nice to have)
**Approved:** (yes/no)
```

**Handoff:**

```yaml
handoffs:
  - label: Fix Issues
    agent: implementation-agent
    prompt: "Fix the following issues:\n\n{{issues}}"
    send: false
  - label: Approve & Deploy
    agent: deploy-agent
    send: false
```

### Test Writer Agent

**Purpose:** Generate comprehensive tests

**Tools:**

```yaml
tools: ['read', 'edit', 'execute', 'search']
```

**Pattern:**

```markdown
You are a Test Writer specialized in comprehensive test coverage.

## Workflow

1. Analyze code to be tested
2. Identify test cases (happy path, edge cases, errors)
3. Write tests using project test framework
4. Run tests to verify they pass
5. Report coverage metrics

## Test Strategy

- Unit tests for all public functions
- Integration tests for API endpoints
- Edge cases and error conditions
- Mock external dependencies
```

### Documentation Agent

**Purpose:** Generate clear documentation

**Tools:**

```yaml
tools: ['read', 'edit', 'search', 'web/fetch']
```

**Pattern:**

```markdown
You are a Documentation Writer specialized in clear technical writing.

## Workflow

1. Analyze code/feature to document
2. Identify key concepts and usage patterns
3. Write structured documentation
4. Include code examples
5. Add cross-references to related docs

## Documentation Standards

- Use Markdown format
- Include code examples for all APIs
- Add "When to Use" sections
- Provide troubleshooting guidance
```

## Quality Checklist

Before finalizing an agent design, verify:

- [ ] **Clear description** - Concise, shows in UI, includes trigger keywords
- [ ] **Minimal tools** - Only necessary tools included
- [ ] **Well-defined role** - Clear identity and purpose statement
- [ ] **Workflow focus** - Agent orchestrates, skills provide knowledge
- [ ] **Skill references** - Links to relevant skills for domain knowledge
- [ ] **Concrete instructions** - Specific, measurable behaviors
- [ ] **Output specifications** - Clear format and quality standards
- [ ] **Handoffs defined** - If part of workflow chain
- [ ] **Constraints stated** - What NOT to do
- [ ] **Concise** - < 100 lines, moves details to skills
- [ ] **Tested** - Design is practical and usable

## File Organization

### Directory Structure

```
.github/
├── agents/
│   ├── planner.agent.md
│   ├── implementation.agent.md
│   ├── security-reviewer.agent.md
│   └── test-writer.agent.md
└── skills/
    ├── angular-development/
    │   └── SKILL.md
    ├── dotnet-clean-architecture/
    │   └── SKILL.md
    └── agent-design/
        └── SKILL.md
```

### Naming Conventions

**Agents:**

- Use kebab-case: `security-reviewer.agent.md`
- Be specific: `api-planner.agent.md` not `planner.agent.md`
- Role-based names: `test-writer.agent.md`

**Skills:**

- For skill naming conventions and creation, see [make-skill-template](../make-skill-template/SKILL.md)

## Reference Syntax

### Referencing Skills from Agents

```markdown
For Angular best practices, consult the [angular-development](../skills/angular-development/SKILL.md) skill.

For .NET architecture, see [dotnet-clean-architecture](../skills/dotnet-clean-architecture/SKILL.md).
```

### Referencing Tools in Body

```markdown
Use #tool:semantic_search to find relevant code patterns.

Use #tool:replace_string_in_file for precise code edits.
```

### MCP Server Tools

```yaml
tools: ['github/*', 'mcp_primeng_*', 'read', 'search']
```

## Advanced Patterns

### Multi-Agent Workflows

**Feature Development Pipeline:**

```
User Request
  → Planner Agent (research & plan)
  → Implementation Agent (write code)
  → Test Writer Agent (create tests)
  → Review Agent (quality check)
  → Documentation Agent (write docs)
  → Deploy Agent (deployment)
```

### Specialized Domain Agents

**Create domain-specific agents that:**

1. Reference domain skills (e.g., angular-development)
2. Use domain-specific MCP tools (e.g., mcp*primeng*\*)
3. Follow domain conventions
4. Integrate with domain workflows

**Example:**

```yaml
---
description: Angular feature implementer using PrimeNG and AWF components
tools: ['read', 'edit', 'search', 'mcp_primeng_*']
---

You are an Angular Feature Implementer.

For Angular patterns and PrimeNG integration, consult the [angular-development](../angular-development/SKILL.md) skill.

## Workflow
1. Review feature requirements
2. Discover PrimeNG components using MCP tools
3. Implement following Angular best practices from skill
4. Test component functionality
```

### Agent Composition Strategies

**Horizontal Composition** (parallel specialized agents):

- Security Reviewer
- Performance Analyzer
- Accessibility Checker
- Code Style Reviewer

**Vertical Composition** (sequential workflow):

- Requirements → Design → Implementation → Testing → Deployment

**Hybrid** (combined approach):

- Plan (single agent)
- Implement (multiple parallel feature agents)
- Review (multiple parallel review agents)
- Deploy (single agent)

## Common Mistakes to Avoid

### ❌ Anti-Patterns

1. **Too many tools**

   ```yaml
   # DON'T: Kitchen sink approach
   tools: ['vscode', 'read', 'edit', 'execute', 'search', 'web', 'agent', 'github/*', 'mcp_*', 'todo', 'notebook/*']
   ```

2. **Vague instructions**

   ```markdown
   # DON'T: Unclear guidance

   You help with code. Do good work.
   ```

3. **Embedding domain knowledge**

   ```markdown
   # DON'T: 500 lines of Angular patterns in agent

   # DO: Reference angular-development skill
   ```

4. **Missing constraints**

   ```markdown
   # DON'T: No boundaries

   You can do anything.

   # DO: Clear constraints

   - Never modify package.json without user approval
   - Only review code, don't implement changes
   ```

5. **Unclear handoffs**

   ```yaml
   # DON'T: Generic labels
   handoffs:
     - label: Next
       agent: other-agent

   # DO: Descriptive labels
   handoffs:
     - label: Implement Security Fixes
       agent: fixer-agent
   ```

### ✅ Best Practices

1. **Focused responsibility**: One clear role per agent
2. **Minimal toolset**: Only necessary tools
3. **Reference skills**: Don't duplicate knowledge
4. **Clear workflow**: Numbered steps, explicit decisions
5. **Measurable outputs**: Concrete deliverables
6. **Safety constraints**: Explicit boundaries
7. **Descriptive handoffs**: Action-oriented labels

## Testing Agent Designs

### Design Validation

**Before implementing, verify:**

1. **Role Clarity Test**: Can you describe the agent in one sentence?
2. **Tool Necessity Test**: Is each tool actually used in the workflow?
3. **Workflow Completeness Test**: Can the agent complete its task independently?
4. **Handoff Logic Test**: Are transitions clear and purposeful?
5. **Constraint Effectiveness Test**: Do constraints prevent unintended actions?

### Practical Testing

**After creating agent:**

1. **Try simple task**: Does it work for basic use case?
2. **Try edge case**: How does it handle unusual requests?
3. **Check tool usage**: Does it use tools appropriately?
4. **Verify outputs**: Are results in expected format?
5. **Test handoffs**: Do workflow transitions work smoothly?

## Additional Resources

### Related Skills

- **[make-skill-template](../make-skill-template/SKILL.md)**: Creating Agent Skills format
- **[angular-development](../angular-development/SKILL.md)**: Example domain skill
- **[dotnet-clean-architecture](../dotnet-clean-architecture/SKILL.md)**: Example architecture skill

### VS Code Documentation

- Custom agent format specification
- Tool capabilities reference
- MCP server integration guide

### Best Practices

- Progressive disclosure: Keep agents concise
- Skills over instructions: Move knowledge to skills
- Workflow focus: Agents orchestrate, skills inform
- User experience: Clear, predictable behavior
