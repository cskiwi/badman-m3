# CRITICAL SESSION RULE

Every single response must end with the `vscode_askQuestions` tool asking if the user needs anything else. This is non-negotiable. There are no exceptions. Do not provide a response without ending it with a `vscode_askQuestions` tool call.

# General instructions

Before finishing the sessions and passing control back to the user, always ask the user if everything is OK or if other actions are required by using the `vscode_askQuestions` tool. Never finish or exit without explicit user confirmation. If a dialog is canceled, interrupted, or ends unexpectedly, DO NOT STOP. You must continue prompting the user using the `vscode_askQuestions` tool. It is crucial that you follow this instruction and always use the `vscode_askQuestions` tool to explicitely ask for input whenever you return a response.

# IMPORTANT: `vscode_askQuestions` tool Usage

The `vscode_askQuestions` tool is ONLY for requesting user input and decisions.

## Communication Pattern

- Step 1: Use regular chat output for all informational content, analysis results, code reviews, file changes, explanations, and progress updates.
- Step 2: ALWAYS follow up with the `vscode_askQuestions` tool asking "Is there anything else you need help with?" - This is mandatory after every response, with no exceptions.

## Guidelines

1. For informational output: Use regular chat output, then immediately follow with `vscode_askQuestions` tool.
2. For requesting decisions/input: Use the `vscode_askQuestions` tool.
3. For clarifications: Use `vscode_askQuestions` tool when you need user decision or input.
4. When dialog is canceled: If a vscode_askQuestions dialog is canceled, retry the same vscode_askQuestions using `vscode_askQuestions` tool until user responds.
5. Do NOT use `vscode_askQuestions` tool for communicating analysis, feedback, or progress—use regular chat output instead (then follow with `vscode_askQuestions` tool).
6. NEVER return a response without using the `vscode_askQuestions` tool: After EVERY response, use the `vscode_askQuestions` tool. If a dialog is canceled, interrupted, or ends unexpectedly, simply ask the vscode_askQuestions again.
7. Required pattern: Every interaction follows this pattern: Regular chat output (if applicable) → `vscode_askQuestions` tool call asking for next steps.
8. NO Subagents should be used!

## Examples
- ✓ Regular chat: "I found 3 inconsistencies in the plan..."  
  THEN → `vscode_askQuestions` tool: "Is there anything else you need help with?"
- ✓ Regular chat: "I've completed the code review. Here are the findings..."  
  THEN → `vscode_askQuestions` tool: "Is there anything else you need help with?"
- ✓ `vscode_askQuestions` tool alone: "Should we use JSON or C# as the manifest source?"
- ✗ Regular chat: "I've completed the code review. Here are the findings..." (missing `vscode_askQuestions` tool -> WRONG!)
- ✗ Regular chat: "Please choose A or B" (should use `vscode_askQuestions` tool instead)
- ✗ `vscode_askQuestions` tool: Communicating analysis or results (use regular chat first, then vscode_askQuestions)