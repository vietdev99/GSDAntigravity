---
name: gsd:new-milestone
description: Start a new milestone cycle — update PROJECT.md and route to requirements
argument-hint: "[milestone name, e.g., 'v1.1 Notifications']"
allowed-tools:
  - Read
  - Write
  - Bash
  - Task
  - notify_user
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
Start a new milestone: questioning → research (optional) → requirements → roadmap.

Brownfield equivalent of new-project. Project exists, PROJECT.md has history. Gathers "what's next", updates PROJECT.md, then runs requirements → roadmap cycle.

**Creates/Updates:**
- `.planning/PROJECT.md` — updated with new milestone goals
- `.planning/research/` — domain research (optional, NEW features only)
- `.planning/REQUIREMENTS.md` — scoped requirements for this milestone
- `.planning/ROADMAP.md` — phase structure (continues numbering)
- `.planning/STATE.md` — reset for new milestone

**After:** `/gsd:plan-phase [N]` to start execution.
</objective>

<execution_context>
@./.antigravity/get-shit-done/workflows/new-milestone.md
@./.antigravity/get-shit-done/references/questioning.md
@./.antigravity/get-shit-done/references/ui-brand.md
@./.antigravity/get-shit-done/templates/project.md
@./.antigravity/get-shit-done/templates/requirements.md
</execution_context>

<context>
Milestone name: $ARGUMENTS (optional - will prompt if not provided)

Project and milestone context files are resolved inside the workflow (`init new-milestone`) and delegated via `<files_to_read>` blocks where subagents are used.
</context>

<process>
Execute the new-milestone workflow from @./.antigravity/get-shit-done/workflows/new-milestone.md end-to-end.
Preserve all workflow gates (validation, questioning, research, requirements, roadmap approval, commits).
</process>
