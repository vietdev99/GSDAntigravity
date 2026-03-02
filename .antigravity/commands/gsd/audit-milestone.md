---
name: gsd:audit-milestone
description: Audit milestone completion against original intent before archiving
argument-hint: "[version]"
allowed-tools:
  - Read
  - Glob
  - Grep
  - Bash
  - Task
  - Write
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
Verify milestone achieved its definition of done. Check requirements coverage, cross-phase integration, and end-to-end flows.

**This command IS the orchestrator.** Reads existing VERIFICATION.md files (phases already verified during execute-phase), aggregates tech debt and deferred gaps, then spawns integration checker for cross-phase wiring.
</objective>

<execution_context>
@./.antigravity/get-shit-done/workflows/audit-milestone.md
</execution_context>

<context>
Version: $ARGUMENTS (optional — defaults to current milestone)

Core planning files are resolved in-workflow (`init milestone-op`) and loaded only as needed.

**Completed Work:**
Glob: .planning/phases/*/*-SUMMARY.md
Glob: .planning/phases/*/*-VERIFICATION.md
</context>

<process>
Execute the audit-milestone workflow from @./.antigravity/get-shit-done/workflows/audit-milestone.md end-to-end.
Preserve all workflow gates (scope determination, verification reading, integration check, requirements coverage, routing).
</process>
