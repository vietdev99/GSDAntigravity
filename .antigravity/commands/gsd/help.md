---
name: gsd:help
description: Show available GSD commands and usage guide
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
Display the complete GSD command reference.

Output ONLY the reference content below. Do NOT add:
- Project-specific analysis
- Git status or file context
- Next-step suggestions
- Any commentary beyond the reference
</objective>

<execution_context>
@./.antigravity/get-shit-done/workflows/help.md
</execution_context>

<process>
Output the complete GSD command reference from @./.antigravity/get-shit-done/workflows/help.md.
Display the reference content directly — no additions or modifications.
</process>
