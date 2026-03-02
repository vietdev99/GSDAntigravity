---
name: gsd:map-codebase
description: Analyze codebase with parallel mapper agents to produce .planning/codebase/ documents
argument-hint: "[optional: specific area to map, e.g., 'api' or 'auth']"
allowed-tools:
  - Read
  - Bash
  - Glob
  - Grep
  - Write
  - Task
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
Analyze existing codebase using parallel gsd-codebase-mapper agents to produce structured codebase documents.

Each mapper agent explores a focus area and **writes documents directly** to `.planning/codebase/`. The orchestrator only receives confirmations, keeping context usage minimal.

Output: .planning/codebase/ folder with 7 structured documents about the codebase state.
</objective>

<execution_context>
@./.antigravity/get-shit-done/workflows/map-codebase.md
</execution_context>

<context>
Focus area: $ARGUMENTS (optional - if provided, tells agents to focus on specific subsystem)

**Load project state if exists:**
Check for .planning/STATE.md - loads context if project already initialized

**This command can run:**
- Before /gsd:new-project (brownfield codebases) - creates codebase map first
- After /gsd:new-project (greenfield codebases) - updates codebase map as code evolves
- Anytime to refresh codebase understanding
</context>

<when_to_use>
**Use map-codebase for:**
- Brownfield projects before initialization (understand existing code first)
- Refreshing codebase map after significant changes
- Onboarding to an unfamiliar codebase
- Before major refactoring (understand current state)
- When STATE.md references outdated codebase info

**Skip map-codebase for:**
- Greenfield projects with no code yet (nothing to map)
- Trivial codebases (<5 files)
</when_to_use>

<process>
1. Check if .planning/codebase/ already exists (offer to refresh or skip)
2. Create .planning/codebase/ directory structure
3. Spawn 4 parallel gsd-codebase-mapper agents:
   - Agent 1: tech focus → writes STACK.md, INTEGRATIONS.md
   - Agent 2: arch focus → writes ARCHITECTURE.md, STRUCTURE.md
   - Agent 3: quality focus → writes CONVENTIONS.md, TESTING.md
   - Agent 4: concerns focus → writes CONCERNS.md
4. Wait for agents to complete, collect confirmations (NOT document contents)
5. Verify all 7 documents exist with line counts
6. Commit codebase map
7. Offer next steps (typically: /gsd:new-project or /gsd:plan-phase)
</process>

<success_criteria>
- [ ] .planning/codebase/ directory created
- [ ] All 7 codebase documents written by mapper agents
- [ ] Documents follow template structure
- [ ] Parallel agents completed without errors
- [ ] User knows next steps
</success_criteria>
