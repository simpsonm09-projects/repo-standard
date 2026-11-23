#!/usr/bin/env node
// The C7.10 `hook-pre-push` policy: read the pushed ref lines from stdin, run
// the env-filename guard, refuse anything the agent access level does not allow,
// and keep the personal fork out of scope. The exact pushed range is scanned by
// gitleaks from the `pre-push` hook job that follows this one.
//
// Git calls the hook with the remote name and URL, then one line per ref:
// <local-ref> <local-sha> <remote-ref> <remote-sha>.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { EXIT } from './lib/exit.mjs';
import { isMain } from './lib/proc.mjs';

function git(root, args) {
  const result = spawnSync('git', ['-C', root, ...args], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
    windowsHide: true,
  });
  if (result.status !== 0) return null;
  const value = (result.stdout ?? '').trim();
  return value.length > 0 ? value : null;
}

function repositoryRoot() {
  return git('.', ['rev-parse', '--show-toplevel']);
}

// The canonical clone owns the sibling repo-standard checkout, even from a
// linked worktree. A checkout of repo-standard itself falls back to its own
// scripts directory.
function resolveShared(root, relative) {
  const common = git(root, ['rev-parse', '--path-format=absolute', '--git-common-dir']);
  if (common !== null) {
    const sibling = resolve(dirname(common), '..', 'repo-standard', relative);
    if (existsSync(sibling)) return sibling;
  }
  const own = resolve(root, relative);
  return existsSync(own) ? own : null;
}

function nodeScript(script, args, input) {
  return spawnSync(process.execPath, [script, ...args], {
    input,
    stdio: [input === undefined ? 'ignore' : 'pipe', 'inherit', 'inherit'],
    windowsHide: true,
  });
}

// Only the organization remote is governed. The personal fork is a private
// mirror and out of scope, so fork alignment keeps working.
export function isOrganizationRemote(url) {
  return /github\.com[/:]simpsonm09-projects\//u.test(url);
}

export function capabilityFor(remoteRef) {
  if (remoteRef === 'refs/heads/main') return 'pushMain';
  if (remoteRef.startsWith('refs/tags/')) return 'pushMain';
  return 'pushBranch';
}

export function pushRefs(input) {
  const refs = [];
  for (const line of input.split('\n')) {
    const fields = line.trim().split(/\s+/u);
    if (fields.length !== 4) continue;
    refs.push({ localRef: fields[0], localSha: fields[1], remoteRef: fields[2], remoteSha: fields[3] });
  }
  return refs;
}

function mergeBase(root, oid) {
  for (const candidate of ['origin/main', 'origin/HEAD', 'main']) {
    if (git(root, ['rev-parse', '--verify', '--quiet', candidate]) === null) continue;
    const base = git(root, ['merge-base', candidate, oid]);
    if (base !== null) return base;
  }
  return null;
}

// The exact pushed range, scanned with the gitleaks pin from mise.toml. A
// checkout without mise.toml (a test fixture) has no pin, so the scan is
// skipped with a warning rather than failing on a missing tool.
function scanRange(root, from, to) {
  const result = spawnSync(
    'mise',
    ['exec', '--', 'gitleaks', 'git', `--log-opts=${from}..${to}`, '--redact', '--no-banner'],
    {
      cwd: root,
      stdio: 'inherit',
      windowsHide: true,
    },
  );
  if (result.error !== undefined) {
    process.stderr.write('hook-pre-push: gitleaks could not start; run `mise install`\n');
    return EXIT.OK;
  }
  return result.status ?? EXIT.FAIL;
}

function scanPushedRanges(root, refs) {
  if (!existsSync(resolve(root, 'mise.toml'))) return EXIT.OK;
  for (const ref of refs) {
    if (/^0+$/u.test(ref.localSha)) continue;
    const to = git(root, ['rev-list', '-n', '1', ref.localSha]);
    if (to === null) continue;
    const from = /^0+$/u.test(ref.remoteSha) ? mergeBase(root, to) : git(root, ['rev-list', '-n', '1', ref.remoteSha]);
    if (from === null) {
      process.stderr.write(`hook-pre-push: could not resolve the base for ${ref.remoteRef}; refusing the push\n`);
      return EXIT.FAIL;
    }
    const status = scanRange(root, from, to);
    if (status !== EXIT.OK) {
      process.stderr.write(`hook-pre-push: gitleaks rejected the pushed range for ${ref.remoteRef}\n`);
      return status;
    }
  }
  return EXIT.OK;
}

export function prePush(argv, input) {
  const url = argv[1] ?? '';
  const root = repositoryRoot();
  if (root === null) {
    process.stderr.write('pre-push: not inside a Git worktree; refusing the push\n');
    return EXIT.FAIL;
  }

  const guard = resolveShared(root, 'scripts/lib/env-pre-push.mjs');
  if (guard === null) {
    process.stderr.write('env/pre-push: shared filename guard is missing; refusing the push\n');
    return EXIT.FAIL;
  }
  const guarded = nodeScript(guard, [], input);
  if (guarded.status !== EXIT.OK) return EXIT.FAIL;

  if (!isOrganizationRemote(url)) return EXIT.OK;

  const resolver = resolveShared(root, 'scripts/agent-access.mjs');
  if (resolver === null) {
    process.stderr.write(`agent-access: no resolver for ${root}, refusing the push to ${basename(url, '.git')}\n`);
    return EXIT.FAIL;
  }

  const repo = basename(url, '.git');
  let status = EXIT.OK;
  for (const line of input.split('\n')) {
    const fields = line.trim().split(/\s+/u);
    const remoteRef = fields[2] ?? '';
    if (remoteRef.length === 0) continue;
    const allowed = nodeScript(resolver, [repo, '--allows', capabilityFor(remoteRef)]);
    if (allowed.status !== EXIT.OK) {
      process.stderr.write(
        `agent-access: ${repo} denies ${capabilityFor(remoteRef)}, so the push of ${remoteRef} is refused\n`,
      );
      status = EXIT.FAIL;
    }
  }
  if (status !== EXIT.OK) {
    process.stderr.write(
      'agent-access: raise the level for this repository in repo-catalog/repos.json to allow this push\n',
    );
    return status;
  }
  return scanPushedRanges(root, pushRefs(input));
}

if (isMain(import.meta.url)) {
  const input = readFileSync(0, 'utf8');
  process.exit(prePush(process.argv.slice(2), input));
}
