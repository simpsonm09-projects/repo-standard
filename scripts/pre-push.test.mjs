#!/usr/bin/env node
// Prove the C7.10 `hook-pre-push` policy without touching the network. The pure
// helpers are checked directly; `prePush` runs against throwaway Git
// repositories with stub shared scripts and a stub `mise exec -- gitleaks`.
//
// Usage:
//   node --test scripts/pre-push.test.mjs
//
// Exits 0 when every assertion holds and 1 on the first failure.

import { spawnSync } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { isMain } from './lib/proc.mjs';
import { capabilityFor, isOrganizationRemote, prePush, pushRefs } from './pre-push.mjs';

const ORG_URL = 'git@github.com:simpsonm09-projects/repo-template.git';
const FORK_URL = 'git@github.com:deathpie/repo-template.git';

function git(root, ...args) {
  const result = spawnSync('git', ['-C', root, ...args], { encoding: 'utf8', windowsHide: true });
  if (result.status !== 0) throw new Error(`git ${args.join(' ')}: ${result.stderr}`);
  return result.stdout.trim();
}

// A repository with a base commit, a head commit, and stub shared scripts. The
// stub `mise` on PATH decides what the gitleaks step reports.
function repository({ allow = true, gitleaks = 0, guard = 0, resolver = true, miseToml = true } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'pre-push-'));
  git(root, 'init', '-q', '-b', 'main');
  git(root, 'config', 'user.email', 'test@example.com');
  git(root, 'config', 'user.name', 'Test');
  writeFileSync(join(root, 'file.txt'), 'base\n');
  git(root, 'add', '.');
  git(root, 'commit', '-q', '-m', 'base');
  const base = git(root, 'rev-parse', 'HEAD');
  writeFileSync(join(root, 'file.txt'), 'head\n');
  git(root, 'commit', '-q', '-am', 'head');
  const head = git(root, 'rev-parse', 'HEAD');

  mkdirSync(join(root, 'scripts', 'lib'), { recursive: true });
  writeFileSync(join(root, 'scripts', 'lib', 'env-pre-push.mjs'), `process.exit(${guard});\n`);
  if (resolver) {
    writeFileSync(join(root, 'scripts', 'agent-access.mjs'), `process.exit(${allow ? 0 : 1});\n`);
  }
  if (miseToml) writeFileSync(join(root, 'mise.toml'), '"aqua:gitleaks/gitleaks" = "8.30.1"\n');

  const bin = join(root, 'bin');
  mkdirSync(bin);
  const mise = join(bin, 'mise');
  writeFileSync(mise, `#!/bin/sh\nexit ${gitleaks}\n`);
  writeFileSync(`${mise}.cmd`, `@exit /b ${gitleaks}\r\n`);
  if (process.platform !== 'win32') chmodSync(mise, 0o755);

  return { root, base, head, bin };
}

function refLine(base, head, remoteRef = 'refs/heads/topic') {
  return `${remoteRef} ${head} ${remoteRef} ${base}\n`;
}

function run(caseFixture, url, input, env = {}) {
  const previousPath = process.env.PATH;
  process.env.PATH = `${caseFixture.bin}:${previousPath}`;
  const previousRoot = process.cwd();
  try {
    process.chdir(caseFixture.root);
    return prePush(['origin', url], input);
  } finally {
    process.chdir(previousRoot);
    process.env.PATH = previousPath;
    void env;
    rmSync(caseFixture.root, { recursive: true, force: true });
  }
}

function testHelpers(assert) {
  assert(isOrganizationRemote(ORG_URL), 'the organization SSH remote is governed');
  assert(
    isOrganizationRemote('https://github.com/simpsonm09-projects/x.git'),
    'the organization HTTPS remote is governed',
  );
  assert(!isOrganizationRemote(FORK_URL), 'the personal fork is out of scope');
  assert(capabilityFor('refs/heads/main') === 'pushMain', 'main needs pushMain');
  assert(capabilityFor('refs/tags/v1') === 'pushMain', 'a tag needs pushMain');
  assert(capabilityFor('refs/heads/topic') === 'pushBranch', 'a branch needs pushBranch');
  const refs = pushRefs(`\n${refLine('a'.repeat(40), 'b'.repeat(40))}malformed\n`);
  assert(refs.length === 1 && refs[0].remoteRef === 'refs/heads/topic', 'pushRefs keeps the four-field lines');
}

function testNonOrganization(assert) {
  const repo = repository();
  assert(run(repo, FORK_URL, refLine(repo.base, repo.head)) === 0, 'a fork push passes without the resolver');
}

function testGuard(assert) {
  const repo = repository({ guard: 1 });
  assert(run(repo, FORK_URL, refLine(repo.base, repo.head)) === 1, 'a failing filename guard refuses the push');
}

function testResolver(assert) {
  const denied = repository({ allow: false });
  assert(run(denied, ORG_URL, refLine(denied.base, denied.head)) === 1, 'a denied capability refuses the push');

  const missing = repository({ resolver: false });
  assert(run(missing, ORG_URL, refLine(missing.base, missing.head)) === 1, 'a missing resolver refuses the push');

  const allowed = repository();
  assert(run(allowed, ORG_URL, refLine(allowed.base, allowed.head)) === 0, 'an allowed push with a clean range passes');
}

function testGitleaks(assert) {
  const leaked = repository({ gitleaks: 1 });
  assert(run(leaked, ORG_URL, refLine(leaked.base, leaked.head)) === 1, 'a leak in the range refuses the push');

  const unpinned = repository({ miseToml: false });
  assert(run(unpinned, ORG_URL, refLine(unpinned.base, unpinned.head)) === 0, 'no mise.toml skips the scan');
}

function testNewBranch(assert) {
  const repo = repository();
  git(repo.root, 'branch', 'base', repo.base);
  git(repo.root, 'update-ref', 'refs/remotes/origin/main', repo.base);
  assert(run(repo, ORG_URL, refLine('0'.repeat(40), repo.head)) === 0, 'a new branch scans from the merge base');
}

export function runTest() {
  const assert = (condition, message) => {
    if (!condition) throw new Error(message);
  };
  try {
    testHelpers(assert);
    testNonOrganization(assert);
    testGuard(assert);
    testResolver(assert);
    testGitleaks(assert);
    testNewBranch(assert);
    process.stdout.write('pre-push.test: ok\n');
    return 0;
  } catch (error) {
    process.stderr.write(`pre-push.test: failed: ${error.message}\n`);
    return 1;
  }
}

if (isMain(import.meta.url)) process.exit(runTest());
