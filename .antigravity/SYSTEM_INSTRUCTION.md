# GSD (Get Shit Done) — Antigravity IDE Integration

You have GSD installed. GSD is a meta-prompting, context engineering and spec-driven development system.

## Available Commands

Run these as slash commands (e.g. `/gsd:help`):

| Command | Purpose |
|---------|---------|
| /gsd:new-project | Initialize a new project |
| /gsd:discuss-phase N | Discuss phase N before planning |
| /gsd:plan-phase N | Create plans for phase N |
| /gsd:execute-phase N | Execute phase N |
| /gsd:verify-work N | Verify phase N results |
| /gsd:progress | Show overall progress |
| /gsd:quick "description" | Quick task without full planning |
| /gsd:help | Show all available commands |

Command files are at: `D:/Workspace/Messi/Code/GSDAntigravity/.antigravity/commands/gsd/`
Agents are at: `D:/Workspace/Messi/Code/GSDAntigravity/.antigravity/agents/`
Workflows are at: `D:/Workspace/Messi/Code/GSDAntigravity/.antigravity/get-shit-done/workflows/`

## Tool Mapping

GSD workflows reference Claude Code tools. In Antigravity, map them as follows:

| Claude Code | Antigravity | Notes |
|-------------|-------------|-------|
| Read | view_file | Also view_file_outline for structure |
| Write | write_to_file | Creates/overwrites files |
| Edit | replace_file_content | Use multi_replace_file_content for non-contiguous edits |
| Bash | run_command | Use command_status to monitor output |
| Task() | run_command | Spawn subagents via terminal |
| AskUserQuestion | notify_user | Set BlockedOnUser=true for questions |
| Glob | find_by_name | File search with glob patterns |
| Grep | grep_search | Ripgrep-based content search |
| WebSearch | search_web | Web search |
| WebFetch | read_url_content | Fetch URL content |

## Task() Subagent Pattern

GSD uses `Task(subagent_type="X", prompt="Y")` to spawn subagents.
In Antigravity, spawn via terminal:

1. Use `run_command` to execute the subagent
2. Use `command_status` to wait for and collect results
3. Parse results from command output

## Project Structure

When GSD initializes a project, it creates:
```
.planning/
├── PROJECT.md          # Project context
├── REQUIREMENTS.md     # Detailed requirements
├── ROADMAP.md          # Phase-based roadmap
├── STATE.md            # Current state
├── config.json         # Settings
├── research/           # Domain research
└── phases/             # Phase plans and summaries
```
