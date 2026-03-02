---
name: gsd:plan-phase
description: Create detailed phase plan (PLAN.md) with verification loop
argument-hint: "[phase] [--auto] [--research] [--skip-research] [--gaps] [--skip-verify] [--prd <file>]"
agent: gsd-planner
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - Grep
  - Task
  - WebFetch
  - mcp__context7__*
---

<antigravity_adapter>
## Tool Mapping (Claude Code → Antigravity IDE)

When this workflow references Claude Code tools, translate to Antigravity equivalents:

| Claude Code | Antigravity | Notes |
|-------------|-------------|-------|
| Read | view_file | Use view_file_outline for structure |
| Write | write_to_file | Creates/overwrites files |
| Edit | replace_file_content | Use multi_replace_file_content for non-contiguous edits |
| Bash | run_command | Returns command ID, use command_status to monitor |
| Task(subagent_type="X", prompt="Y") | run_command | Spawn subagent via terminal command |
| AskUserQuestion | notify_user | Set BlockedOnUser=true for questions |
| Glob | find_by_name | File search with glob patterns |
| Grep | grep_search | Ripgrep-based search |

## Task() → Terminal Spawning

GSD workflows use `Task(subagent_type="X", prompt="Y")` to spawn subagents.
In Antigravity, spawn agents via terminal using `run_command`:

- Pass the agent prompt and context as arguments
- Use `command_status` to wait for completion
- Collect results from command output

## AskUserQuestion → notify_user

Translate `AskUserQuestion` calls to `notify_user`:
- `header` → included in Message
- `question` → included in Message  
- Set `BlockedOnUser: true` to wait for user response
- Options formatted as numbered list in Message
</antigravity_adapter>

<objective>
Create executable phase prompts (PLAN.md files) for a roadmap phase with integrated research and verification.

**Default flow:** Research (if needed) → Plan → Verify → Done

**Orchestrator role:** Parse arguments, validate phase, research domain (unless skipped), spawn gsd-planner, verify with gsd-plan-checker, iterate until pass or max iterations, present results.
</objective>

<execution_context>
@./.antigravity/get-shit-done/workflows/plan-phase.md
@./.antigravity/get-shit-done/references/ui-brand.md
</execution_context>

<context>
Phase number: $ARGUMENTS (optional — auto-detects next unplanned phase if omitted)

**Flags:**
- `--research` — Force re-research even if RESEARCH.md exists
- `--skip-research` — Skip research, go straight to planning
- `--gaps` — Gap closure mode (reads VERIFICATION.md, skips research)
- `--skip-verify` — Skip verification loop
- `--prd <file>` — Use a PRD/acceptance criteria file instead of discuss-phase. Parses requirements into CONTEXT.md automatically. Skips discuss-phase entirely.

Normalize phase input in step 2 before any directory lookups.
</context>

<process>
Execute the plan-phase workflow from @./.antigravity/get-shit-done/workflows/plan-phase.md end-to-end.
Preserve all workflow gates (validation, research, planning, verification loop, routing).
</process>
