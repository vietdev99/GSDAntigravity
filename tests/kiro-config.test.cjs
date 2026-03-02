/**
 * GSD Tools Tests - kiro-config.test.cjs
 *
 * Tests for Kiro IDE tool name mapping, agent conversion,
 * adapter header, workflow adapter, system instruction, and directory config.
 */

// Enable test exports from install.js (skips main CLI logic)
process.env.GSD_TEST_MODE = '1';

const { test, describe } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const os = require('os');

const {
    convertKiroToolName,
    convertClaudeToKiroAgent,
    getKiroAdapterHeader,
    getKiroWorkflowAdapter,
    getKiroSystemInstruction,
    claudeToKiroTools,
    getDirName,
    getGlobalDir,
    getConfigDirFromHome,
} = require('../bin/install.js');

// ─── convertKiroToolName ─────────────────────────────────────────────────────

describe('convertKiroToolName', () => {
    test('maps Read to read_file', () => {
        assert.strictEqual(convertKiroToolName('Read'), 'read_file');
    });

    test('maps Write to write_file', () => {
        assert.strictEqual(convertKiroToolName('Write'), 'write_file');
    });

    test('maps Edit to edit_file', () => {
        assert.strictEqual(convertKiroToolName('Edit'), 'edit_file');
    });

    test('maps Bash to executeBash', () => {
        assert.strictEqual(convertKiroToolName('Bash'), 'executeBash');
    });

    test('maps Task to executeBash', () => {
        assert.strictEqual(convertKiroToolName('Task'), 'executeBash');
    });

    test('maps Glob to list_files', () => {
        assert.strictEqual(convertKiroToolName('Glob'), 'list_files');
    });

    test('maps Grep to search_files', () => {
        assert.strictEqual(convertKiroToolName('Grep'), 'search_files');
    });

    test('maps AskUserQuestion to ask_user', () => {
        assert.strictEqual(convertKiroToolName('AskUserQuestion'), 'ask_user');
    });

    test('maps TodoWrite to write_file', () => {
        assert.strictEqual(convertKiroToolName('TodoWrite'), 'write_file');
    });

    test('excludes MCP tools (returns null)', () => {
        assert.strictEqual(convertKiroToolName('mcp__server__tool'), null);
    });

    test('unknown tools lowercase by default', () => {
        assert.strictEqual(convertKiroToolName('CustomTool'), 'customtool');
    });
});

// ─── claudeToKiroTools mapping ───────────────────────────────────────────────

describe('claudeToKiroTools', () => {
    test('has all expected tool mappings', () => {
        const expectedKeys = [
            'Read', 'Write', 'Edit', 'Bash', 'Glob', 'Grep',
            'WebSearch', 'WebFetch', 'TodoWrite', 'AskUserQuestion', 'Task',
        ];
        for (const key of expectedKeys) {
            assert.ok(key in claudeToKiroTools, `mapping for ${key} exists`);
        }
    });

    test('has 11 mappings', () => {
        assert.strictEqual(Object.keys(claudeToKiroTools).length, 11);
    });
});

// ─── convertClaudeToKiroAgent ────────────────────────────────────────────────

describe('convertClaudeToKiroAgent', () => {
    test('converts allowed-tools to Kiro tool names', () => {
        const input = `---
name: gsd-executor
description: Executes GSD plans
allowed-tools:
  - Read
  - Write
  - Bash
  - Grep
---

Body content`;

        const result = convertClaudeToKiroAgent(input);
        assert.ok(result.includes('tools:'), 'has tools field');
        assert.ok(result.includes('  - read_file'), 'has read_file');
        assert.ok(result.includes('  - write_file'), 'has write_file');
        assert.ok(result.includes('  - executeBash'), 'has executeBash');
        assert.ok(result.includes('  - search_files'), 'has search_files');
    });

    test('strips color field', () => {
        const input = `---
name: gsd-test
color: green
allowed-tools:
  - Read
---

Body`;

        const result = convertClaudeToKiroAgent(input);
        assert.ok(!result.includes('color:'), 'color field removed');
    });

    test('deduplicates tool names (Write + TodoWrite → single write_file)', () => {
        const input = `---
name: gsd-test
allowed-tools:
  - Write
  - TodoWrite
  - Read
---

Body`;

        const result = convertClaudeToKiroAgent(input);
        const toolsSection = result.substring(result.indexOf('tools:'));
        const matches = toolsSection.match(/write_file/g);
        assert.strictEqual(matches.length, 1, 'write_file appears only once');
    });

    test('excludes MCP tools', () => {
        const input = `---
name: gsd-test
allowed-tools:
  - Read
  - mcp__github__search
  - Bash
---

Body`;

        const result = convertClaudeToKiroAgent(input);
        assert.ok(!result.includes('mcp__'), 'MCP tools excluded');
    });

    test('replaces AskUserQuestion in body text', () => {
        const input = `---
name: gsd-test
allowed-tools:
  - Read
---

Use AskUserQuestion to ask.`;

        const result = convertClaudeToKiroAgent(input);
        assert.ok(result.includes('ask_user'), 'AskUserQuestion replaced');
        assert.ok(!result.includes('AskUserQuestion'), 'original removed');
    });

    test('handles content without frontmatter', () => {
        const input = 'Just some plain content.';
        const result = convertClaudeToKiroAgent(input);
        assert.strictEqual(result, input, 'returns input unchanged');
    });
});

// ─── getKiroAdapterHeader ────────────────────────────────────────────────────

describe('getKiroAdapterHeader', () => {
    test('contains kiro_adapter tags', () => {
        const result = getKiroAdapterHeader();
        assert.ok(result.includes('<kiro_adapter>'), 'has opening tag');
        assert.ok(result.includes('</kiro_adapter>'), 'has closing tag');
    });

    test('contains executeBash mapping', () => {
        const result = getKiroAdapterHeader();
        assert.ok(result.includes('executeBash'), 'has executeBash');
        assert.ok(result.includes('ask_user'), 'has ask_user');
    });

    test('documents Task() spawning', () => {
        const result = getKiroAdapterHeader();
        assert.ok(result.includes('Task()'), 'mentions Task()');
    });
});

// ─── getKiroWorkflowAdapter ──────────────────────────────────────────────────

describe('getKiroWorkflowAdapter', () => {
    test('contains kiro_tools tags', () => {
        const result = getKiroWorkflowAdapter();
        assert.ok(result.includes('<kiro_tools>'), 'has opening tag');
        assert.ok(result.includes('</kiro_tools>'), 'has closing tag');
    });

    test('contains key tool mappings', () => {
        const result = getKiroWorkflowAdapter();
        assert.ok(result.includes('executeBash'), 'has executeBash');
        assert.ok(result.includes('ask_user'), 'has ask_user');
        assert.ok(result.includes('read_file'), 'has read_file');
    });

    test('is smaller than full adapter', () => {
        const workflow = getKiroWorkflowAdapter();
        const full = getKiroAdapterHeader();
        assert.ok(workflow.length < full.length, 'compact adapter is shorter');
    });
});

// ─── getKiroSystemInstruction ────────────────────────────────────────────────

describe('getKiroSystemInstruction', () => {
    test('contains GSD and Kiro title', () => {
        const result = getKiroSystemInstruction('/test/path');
        assert.ok(result.includes('GSD'), 'has GSD');
        assert.ok(result.includes('Kiro'), 'has Kiro');
    });

    test('lists main commands', () => {
        const result = getKiroSystemInstruction('/test/path');
        assert.ok(result.includes('/gsd:new-project'), 'has new-project');
        assert.ok(result.includes('/gsd:execute-phase'), 'has execute-phase');
        assert.ok(result.includes('/gsd:help'), 'has help');
    });

    test('contains executeBash mapping', () => {
        const result = getKiroSystemInstruction('/test/path');
        assert.ok(result.includes('executeBash'), 'has executeBash');
        assert.ok(result.includes('ask_user'), 'has ask_user');
    });

    test('includes .planning/ structure', () => {
        const result = getKiroSystemInstruction('/test/path');
        assert.ok(result.includes('.planning/'), 'has .planning/');
        assert.ok(result.includes('PROJECT.md'), 'has PROJECT.md');
    });
});

// ─── getDirName / getConfigDirFromHome / getGlobalDir (kiro) ─────────────────

describe('getDirName (kiro)', () => {
    test('returns .kiro', () => {
        assert.strictEqual(getDirName('kiro'), '.kiro');
    });
});

describe('getConfigDirFromHome (kiro)', () => {
    test('returns .kiro path segment', () => {
        const result = getConfigDirFromHome('kiro', true);
        assert.strictEqual(result, "'.kiro'");
    });
});

describe('getGlobalDir (kiro)', () => {
    test('defaults to ~/.kiro', () => {
        const saved = process.env.KIRO_CONFIG_DIR;
        delete process.env.KIRO_CONFIG_DIR;

        const result = getGlobalDir('kiro', null);
        const expected = path.join(os.homedir(), '.kiro');
        assert.strictEqual(result, expected);

        if (saved !== undefined) process.env.KIRO_CONFIG_DIR = saved;
    });

    test('respects KIRO_CONFIG_DIR env var', () => {
        const saved = process.env.KIRO_CONFIG_DIR;
        process.env.KIRO_CONFIG_DIR = '/custom/kiro/path';

        const result = getGlobalDir('kiro', null);
        assert.strictEqual(result, '/custom/kiro/path');

        if (saved !== undefined) {
            process.env.KIRO_CONFIG_DIR = saved;
        } else {
            delete process.env.KIRO_CONFIG_DIR;
        }
    });

    test('explicit dir overrides env var', () => {
        const saved = process.env.KIRO_CONFIG_DIR;
        process.env.KIRO_CONFIG_DIR = '/env/kiro';

        const result = getGlobalDir('kiro', '/explicit/kiro');
        assert.strictEqual(result, '/explicit/kiro');

        if (saved !== undefined) {
            process.env.KIRO_CONFIG_DIR = saved;
        } else {
            delete process.env.KIRO_CONFIG_DIR;
        }
    });
});
