/**
 * GSD Tools Tests - antigravity-config.cjs
 *
 * Tests for Antigravity tool name mapping, agent conversion,
 * adapter header, and directory configuration.
 */

// Enable test exports from install.js (skips main CLI logic)
process.env.GSD_TEST_MODE = '1';

const { test, describe } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const os = require('os');

const {
    convertAntigravityToolName,
    convertClaudeToAntigravityAgent,
    getAntigravityAdapterHeader,
    claudeToAntigravityTools,
    getDirName,
    getGlobalDir,
    getConfigDirFromHome,
} = require('../bin/install.js');

// ─── convertAntigravityToolName ───────────────────────────────────────────────

describe('convertAntigravityToolName', () => {
    test('maps Read to view_file', () => {
        assert.strictEqual(convertAntigravityToolName('Read'), 'view_file');
    });

    test('maps Write to write_to_file', () => {
        assert.strictEqual(convertAntigravityToolName('Write'), 'write_to_file');
    });

    test('maps Edit to replace_file_content', () => {
        assert.strictEqual(convertAntigravityToolName('Edit'), 'replace_file_content');
    });

    test('maps Bash to run_command', () => {
        assert.strictEqual(convertAntigravityToolName('Bash'), 'run_command');
    });

    test('maps Task to run_command', () => {
        assert.strictEqual(convertAntigravityToolName('Task'), 'run_command');
    });

    test('maps Glob to find_by_name', () => {
        assert.strictEqual(convertAntigravityToolName('Glob'), 'find_by_name');
    });

    test('maps Grep to grep_search', () => {
        assert.strictEqual(convertAntigravityToolName('Grep'), 'grep_search');
    });

    test('maps WebSearch to search_web', () => {
        assert.strictEqual(convertAntigravityToolName('WebSearch'), 'search_web');
    });

    test('maps WebFetch to read_url_content', () => {
        assert.strictEqual(convertAntigravityToolName('WebFetch'), 'read_url_content');
    });

    test('maps AskUserQuestion to notify_user', () => {
        assert.strictEqual(convertAntigravityToolName('AskUserQuestion'), 'notify_user');
    });

    test('maps TodoWrite to write_to_file', () => {
        assert.strictEqual(convertAntigravityToolName('TodoWrite'), 'write_to_file');
    });

    test('excludes MCP tools (returns null)', () => {
        assert.strictEqual(convertAntigravityToolName('mcp__server__tool'), null);
        assert.strictEqual(convertAntigravityToolName('mcp__github__search'), null);
    });

    test('unknown tools lowercase by default', () => {
        assert.strictEqual(convertAntigravityToolName('CustomTool'), 'customtool');
        assert.strictEqual(convertAntigravityToolName('SomeNewTool'), 'somenewtool');
    });
});

// ─── claudeToAntigravityTools mapping ──────────────────────────────────────────

describe('claudeToAntigravityTools', () => {
    test('has all expected tool mappings', () => {
        const expectedKeys = [
            'Read', 'Write', 'Edit', 'Bash', 'Glob', 'Grep',
            'WebSearch', 'WebFetch', 'TodoWrite', 'AskUserQuestion', 'Task',
        ];
        for (const key of expectedKeys) {
            assert.ok(key in claudeToAntigravityTools, `mapping for ${key} exists`);
        }
    });

    test('has 11 mappings', () => {
        assert.strictEqual(Object.keys(claudeToAntigravityTools).length, 11);
    });
});

// ─── convertClaudeToAntigravityAgent ──────────────────────────────────────────

describe('convertClaudeToAntigravityAgent', () => {
    test('converts allowed-tools to Antigravity tool names', () => {
        const input = `---
name: gsd-executor
description: Executes GSD plans with atomic commits
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Grep
  - Glob
  - Task
---

<role>
You are a GSD plan executor.
</role>`;

        const result = convertClaudeToAntigravityAgent(input);

        assert.ok(result.includes('tools:'), 'has tools field');
        assert.ok(result.includes('  - view_file'), 'has view_file');
        assert.ok(result.includes('  - write_to_file'), 'has write_to_file');
        assert.ok(result.includes('  - replace_file_content'), 'has replace_file_content');
        assert.ok(result.includes('  - run_command'), 'has run_command');
        assert.ok(result.includes('  - grep_search'), 'has grep_search');
        assert.ok(result.includes('  - find_by_name'), 'has find_by_name');
        assert.ok(!result.includes('allowed-tools:'), 'removed allowed-tools');
    });

    test('strips color field', () => {
        const input = `---
name: gsd-test
description: Test agent
color: yellow
allowed-tools:
  - Read
---

Body content`;

        const result = convertClaudeToAntigravityAgent(input);
        assert.ok(!result.includes('color: yellow'), 'color field removed');
        assert.ok(!result.includes('color:'), 'no color field');
    });

    test('deduplicates tool names (Write + TodoWrite → single write_to_file)', () => {
        const input = `---
name: gsd-test
description: Test agent
allowed-tools:
  - Write
  - TodoWrite
  - Read
---

Body`;

        const result = convertClaudeToAntigravityAgent(input);

        // Count occurrences of write_to_file in tools section
        const toolsSection = result.substring(result.indexOf('tools:'));
        const matches = toolsSection.match(/write_to_file/g);
        assert.strictEqual(matches.length, 1, 'write_to_file appears only once');
    });

    test('excludes MCP tools', () => {
        const input = `---
name: gsd-test
description: Test agent
allowed-tools:
  - Read
  - mcp__server__tool
  - Bash
---

Body`;

        const result = convertClaudeToAntigravityAgent(input);
        assert.ok(!result.includes('mcp__'), 'MCP tools excluded');
        assert.ok(result.includes('  - view_file'), 'Read mapped');
        assert.ok(result.includes('  - run_command'), 'Bash mapped');
    });

    test('replaces tool name references in body text', () => {
        const input = `---
name: gsd-test
description: Test agent
allowed-tools:
  - Read
---

Use AskUserQuestion to ask the user.
Use TodoWrite to manage tasks.
Use SlashCommand to run commands.`;

        const result = convertClaudeToAntigravityAgent(input);
        assert.ok(result.includes('notify_user'), 'AskUserQuestion replaced');
        assert.ok(result.includes('write_to_file'), 'TodoWrite replaced in body');
        assert.ok(result.includes('command'), 'SlashCommand replaced');
        assert.ok(!result.includes('AskUserQuestion'), 'AskUserQuestion removed');
    });

    test('handles inline tools: format (comma-separated)', () => {
        const input = `---
name: gsd-test
description: Test agent
tools: Read, Write, Bash, Grep
---

Body`;

        const result = convertClaudeToAntigravityAgent(input);
        assert.ok(result.includes('  - view_file'), 'Read mapped');
        assert.ok(result.includes('  - write_to_file'), 'Write mapped');
        assert.ok(result.includes('  - run_command'), 'Bash mapped');
        assert.ok(result.includes('  - grep_search'), 'Grep mapped');
    });

    test('strips <sub> tags from body', () => {
        const input = `---
name: gsd-test
description: Test agent
allowed-tools:
  - Read
---

Some text <sub>subscript</sub> more text.`;

        const result = convertClaudeToAntigravityAgent(input);
        assert.ok(!result.includes('<sub>'), 'sub tags stripped');
        assert.ok(!result.includes('</sub>'), 'closing sub tags stripped');
    });

    test('handles content without frontmatter', () => {
        const input = 'Just some content without frontmatter.';
        const result = convertClaudeToAntigravityAgent(input);
        assert.strictEqual(result, input, 'returns input unchanged');
    });

    test('preserves name and description in frontmatter', () => {
        const input = `---
name: gsd-executor
description: Executes plans
allowed-tools:
  - Read
---

Body`;

        const result = convertClaudeToAntigravityAgent(input);
        assert.ok(result.includes('name: gsd-executor'), 'name preserved');
        assert.ok(result.includes('description: Executes plans'), 'description preserved');
    });
});

// ─── getAntigravityAdapterHeader ──────────────────────────────────────────────

describe('getAntigravityAdapterHeader', () => {
    test('contains adapter tags', () => {
        const result = getAntigravityAdapterHeader();
        assert.ok(result.includes('<antigravity_adapter>'), 'has opening tag');
        assert.ok(result.includes('</antigravity_adapter>'), 'has closing tag');
    });

    test('contains tool mapping table', () => {
        const result = getAntigravityAdapterHeader();
        assert.ok(result.includes('view_file'), 'has view_file');
        assert.ok(result.includes('write_to_file'), 'has write_to_file');
        assert.ok(result.includes('replace_file_content'), 'has replace_file_content');
        assert.ok(result.includes('run_command'), 'has run_command');
        assert.ok(result.includes('notify_user'), 'has notify_user');
    });

    test('documents Task() → terminal spawning', () => {
        const result = getAntigravityAdapterHeader();
        assert.ok(result.includes('Task()'), 'mentions Task()');
        assert.ok(result.includes('Terminal Spawning'), 'has spawning section');
        assert.ok(result.includes('command_status'), 'mentions command_status');
    });

    test('documents AskUserQuestion → notify_user', () => {
        const result = getAntigravityAdapterHeader();
        assert.ok(result.includes('AskUserQuestion'), 'mentions AskUserQuestion');
        assert.ok(result.includes('BlockedOnUser'), 'mentions BlockedOnUser');
    });
});

// ─── getDirName ───────────────────────────────────────────────────────────────

describe('getDirName (antigravity)', () => {
    test('returns .antigravity', () => {
        assert.strictEqual(getDirName('antigravity'), '.antigravity');
    });

    test('does not affect other runtimes', () => {
        assert.strictEqual(getDirName('claude'), '.claude');
        assert.strictEqual(getDirName('opencode'), '.opencode');
        assert.strictEqual(getDirName('gemini'), '.gemini');
        assert.strictEqual(getDirName('codex'), '.codex');
    });
});

// ─── getConfigDirFromHome ─────────────────────────────────────────────────────

describe('getConfigDirFromHome (antigravity)', () => {
    test('returns gemini/antigravity path segments', () => {
        const result = getConfigDirFromHome('antigravity', true);
        assert.strictEqual(result, "'.gemini', 'antigravity'");
    });
});

// ─── getGlobalDir ─────────────────────────────────────────────────────────────

describe('getGlobalDir (antigravity)', () => {
    test('defaults to ~/.gemini/antigravity', () => {
        // Clear env var to test default
        const saved = process.env.ANTIGRAVITY_CONFIG_DIR;
        delete process.env.ANTIGRAVITY_CONFIG_DIR;

        const result = getGlobalDir('antigravity', null);
        const expected = path.join(os.homedir(), '.gemini', 'antigravity');
        assert.strictEqual(result, expected);

        // Restore
        if (saved !== undefined) process.env.ANTIGRAVITY_CONFIG_DIR = saved;
    });

    test('respects ANTIGRAVITY_CONFIG_DIR env var', () => {
        const saved = process.env.ANTIGRAVITY_CONFIG_DIR;
        process.env.ANTIGRAVITY_CONFIG_DIR = '/custom/path';

        const result = getGlobalDir('antigravity', null);
        assert.strictEqual(result, '/custom/path');

        // Restore
        if (saved !== undefined) {
            process.env.ANTIGRAVITY_CONFIG_DIR = saved;
        } else {
            delete process.env.ANTIGRAVITY_CONFIG_DIR;
        }
    });

    test('explicit dir overrides env var', () => {
        const saved = process.env.ANTIGRAVITY_CONFIG_DIR;
        process.env.ANTIGRAVITY_CONFIG_DIR = '/env/path';

        const result = getGlobalDir('antigravity', '/explicit/path');
        assert.strictEqual(result, '/explicit/path');

        // Restore
        if (saved !== undefined) {
            process.env.ANTIGRAVITY_CONFIG_DIR = saved;
        } else {
            delete process.env.ANTIGRAVITY_CONFIG_DIR;
        }
    });
});
