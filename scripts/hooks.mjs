#!/usr/bin/env node
// Install the shared Lefthook hooks (core.md C7.8). A local `core.hooksPath`
// that equals `.githooks` is migrated; any other value, and a global one, is
// refused because it is a deliberate machine setting. `lefthook install` only
// warns when the remote config cannot be fetched, so the merged job list is
// asserted before success is reported.
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { EXIT } from './lib/exit.mjs';
import { isMain } from './lib/proc.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SHARED_JOBS = ['core-fmt', 'core-forbidden-files', 'core-policy', 'owner-signing'];

function git(root, args) {
  return execFileSync('git', ['-C', root, ...args], { encoding: 'utf8', windowsHide: true }).trim();
}

function tryGit(root, args) {
  try {
    return git(root, args);
  } catch {
    return null;
  }
}

function fail(message) {
  process.stderr.write(`${message}\n`);
  return EXIT.FAIL;
}

// Copy the guarded pre-push hook into this clone's hooks directory.
export function installHooks(root = ROOT) {
  const global = tryGit(root, ['config', '--global', '--get', 'core.hooksPath']);
  if (global) {
    return fail(
      `A global core.hooksPath is set (${global}); lefthook install refuses it.\n` +
        'Remove it yourself, or use `lefthook install --force` only if you really mean it.',
    );
  }

  const existing = tryGit(root, ['config', '--get', 'core.hooksPath']);
  if (existing && existing !== '.githooks') {
    return fail(`core.hooksPath is ${existing}; integrate it manually.`);
  }
  if (existing === '.githooks') {
    git(root, ['config', '--unset-all', '--local', 'core.hooksPath']);
  }

  try {
    execFileSync('mise', ['exec', '--', 'lefthook', 'install'], {
      cwd: root,
      stdio: 'inherit',
      windowsHide: true,
    });
  } catch {
    return fail('lefthook install failed; run `mise install` and try again.');
  }

  // A failed remote sync only warns in 2.2.2 and still exits 0, so assert the
  // shared jobs loaded before declaring success.
  const dump = execFileSync('mise', ['exec', '--', 'lefthook', 'dump'], {
    cwd: root,
    encoding: 'utf8',
    windowsHide: true,
  });
  const missing = SHARED_JOBS.filter((job) => !dump.includes(`name: ${job}`));
  if (missing.length > 0) {
    return fail(
      `The shared hook config did not load (missing ${missing.join(', ')}); check access to the .github repository.`,
    );
  }

  const hooksDir = git(root, ['rev-parse', '--path-format=absolute', '--git-path', 'hooks']);
  for (const name of ['pre-commit', 'pre-push']) {
    if (!existsSync(resolve(hooksDir, name))) {
      return fail(`Lefthook did not write the ${name} shim.`);
    }
  }

  process.stdout.write('Shared Lefthook hooks installed; no global settings changed.\n');
  return EXIT.OK;
}

if (isMain(import.meta.url)) process.exit(installHooks());
