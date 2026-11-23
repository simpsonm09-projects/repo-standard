#!/usr/bin/env node
// Prove the `hooks` group of check-standard (core.md C7.8-C7.11). Each rule
// gets a violating fixture that must report its named gap and a compliant
// fixture that must report none. The fixtures are throwaway directories, so no
// repository is read.
//
// Usage:
//   node --test scripts/check-standard.test.mjs
//
// Exits 0 when every assertion holds and 1 on the first failure.

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { checkStandard } from './check-standard.mjs';
import { isMain } from './lib/proc.mjs';

const LEFTHOOK = [
  'remotes:',
  '  - git_url: https://github.com/simpsonm09-projects/.github',
  '    ref: hooks-v3',
  '    configs:',
  '      - hooks/core.yml',
  '      - hooks/owner.yml',
  '',
].join('\n');

const MISE = [
  '"aqua:casey/just" = "1.59.0"',
  '"aqua:evilmartians/lefthook" = "2.2.2"',
  '"aqua:gitleaks/gitleaks" = "8.30.1"',
  '',
].join('\n');

const JUSTFILE = [
  'fmt *files:',
  '    echo fmt',
  'lint *files:',
  '    echo lint',
  'secrets-staged:',
  '    echo secrets',
  'forbidden-files *files:',
  '    echo forbidden',
  'workflows *files:',
  '    echo workflows',
  'shellcheck *files:',
  '    echo shellcheck',
  'agent-files:',
  '    echo agents',
  'commit-msg file:',
  '    echo commit',
  'hook-pre-push:',
  '    echo pre-push',
  'pre-push-check:',
  '    echo fast',
  'deps-refresh *files:',
  '    echo deps',
  'signing-check:',
  '    echo signing',
  '',
].join('\n');

const CI = [
  'name: CI',
  'on: pull_request',
  'jobs:',
  '  hooks:',
  '    runs-on: ubuntu-24.04',
  '    steps:',
  '      - run: lefthook install',
  '      - run: lefthook dump',
  '      - run: lefthook validate',
  '      - run: echo core-fmt core-forbidden-files core-policy owner-signing',
  '',
].join('\n');

const AGENTS = 'Never skip a hook: no LEFTHOOK=0 and no --no-verify.\n';

const GITIGNORE = 'lefthook-local.yml\n';

function fixture(files) {
  const root = mkdtempSync(join(tmpdir(), 'check-standard-hooks-'));
  for (const [rel, text] of Object.entries(files)) {
    const full = join(root, rel);
    mkdirSync(join(full, '..'), { recursive: true });
    writeFileSync(full, text);
  }
  return root;
}

function complete(overrides = {}) {
  return fixture({
    'lefthook.yml': LEFTHOOK,
    'mise.toml': MISE,
    justfile: JUSTFILE,
    '.github/workflows/ci.yml': CI,
    '.gitignore': GITIGNORE,
    'AGENTS.md': AGENTS,
    ...overrides,
  });
}

function hooksGaps(root) {
  return checkStandard(root)
    .gaps.filter((gap) => gap.id.startsWith('hooks/'))
    .map((gap) => gap.id);
}

function expect(assert, root, ids, message) {
  const gaps = hooksGaps(root);
  try {
    assert(gaps.join() === ids.join(), `${message}: got ${gaps.join() || 'none'}`);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function testComplete(assert) {
  expect(assert, complete(), [], 'a complete hooks setup reports nothing');
}

function testMissing(assert) {
  const root = fixture({});
  try {
    const gaps = hooksGaps(root);
    assert(gaps.includes('hooks/lefthook'), 'a missing lefthook.yml is a gap');
    assert(gaps.filter((id) => id === 'hooks/recipes').length === 12, 'every missing recipe is a gap');
    assert(gaps.includes('hooks/gitignore'), 'a missing ignore entry is a gap');
    assert(gaps.includes('hooks/agents'), 'a missing AGENTS.md is a gap');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function testRemotes(assert) {
  expect(
    assert,
    complete({ 'lefthook.yml': LEFTHOOK.replace('simpsonm09-projects/.github', 'someone/.github') }),
    ['hooks/remotes'],
    'the wrong repository is reported',
  );
  expect(
    assert,
    complete({ 'lefthook.yml': LEFTHOOK.replace('hooks-v3', 'main') }),
    ['hooks/remotes'],
    'the wrong ref is reported',
  );
  expect(
    assert,
    complete({ 'lefthook.yml': LEFTHOOK.replace('      - hooks/owner.yml\n', '') }),
    ['hooks/remotes'],
    'a missing config is reported',
  );
  expect(
    assert,
    complete({ 'lefthook.yml': `${LEFTHOOK}pre-commit:\n  jobs:\n    - name: core-fmt\n      run: just fmt\n` }),
    ['hooks/job-name'],
    'a shared job name is reported',
  );
}

function testPins(assert) {
  expect(
    assert,
    complete({ 'mise.toml': MISE.replace('"aqua:evilmartians/lefthook" = "2.2.2"\n', '') }),
    ['hooks/lefthook-pin'],
    'a missing lefthook pin is reported',
  );
  expect(
    assert,
    complete({ 'mise.toml': MISE.replace('"aqua:gitleaks/gitleaks" = "8.30.1"\n', '') }),
    ['hooks/gitleaks-pin'],
    'a missing gitleaks pin is reported',
  );
}

function testRecipes(assert) {
  expect(
    assert,
    complete({ justfile: JUSTFILE.replace('fmt *files:', 'fmt:') }),
    ['hooks/recipes'],
    'a non-variadic file recipe is reported',
  );
  expect(
    assert,
    complete({ justfile: JUSTFILE.replace('signing-check:\n    echo signing\n', '') }),
    ['hooks/recipes'],
    'a missing owner recipe is reported',
  );
}

function testCi(assert) {
  expect(
    assert,
    complete({ '.github/workflows/ci.yml': 'name: CI\non: pull_request\njobs:\n  test:\n    runs-on: ubuntu-24.04\n' }),
    ['hooks/ci'],
    'a missing hooks job is reported',
  );
  expect(
    assert,
    complete({ '.github/workflows/ci.yml': CI.replace('      - run: lefthook dump\n', '') }),
    ['hooks/ci'],
    'a missing dump assertion is reported',
  );
  expect(
    assert,
    complete({ '.github/workflows/ci.yml': CI.replace('owner-signing', '') }),
    ['hooks/ci'],
    'a missing shared job assertion is reported',
  );
  expect(
    assert,
    complete({ '.github/workflows/ci.yml': CI.replace('    runs-on: ubuntu-24.04\n', '') }),
    ['hooks/ci'],
    'a hooks job with no runner is reported',
  );
}

function testIgnoreAndAgents(assert) {
  expect(assert, complete({ '.gitignore': 'node_modules/\n' }), ['hooks/gitignore'], 'an ignore gap is reported');
  expect(
    assert,
    complete({ 'AGENTS.md': 'Hooks are advisory.\n' }),
    ['hooks/agents'],
    'missing C7.11 wording is reported',
  );
}

function testGithooks(assert) {
  const root = complete({ '.githooks/pre-push': '#!/bin/sh\n' });
  expect(assert, root, ['hooks/githooks'], 'a leftover .githooks directory is reported');
}

export function runTest() {
  const assert = (condition, message) => {
    if (!condition) throw new Error(message);
  };
  try {
    testComplete(assert);
    testMissing(assert);
    testRemotes(assert);
    testPins(assert);
    testRecipes(assert);
    testCi(assert);
    testIgnoreAndAgents(assert);
    testGithooks(assert);
    process.stdout.write('check-standard.test: ok\n');
    return 0;
  } catch (error) {
    process.stderr.write(`check-standard.test: failed: ${error.message}\n`);
    return 1;
  }
}

if (isMain(import.meta.url)) process.exit(runTest());
