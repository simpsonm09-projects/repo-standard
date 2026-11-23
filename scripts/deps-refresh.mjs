#!/usr/bin/env node
/**
 * Refresh locked dependencies after a checkout or merge (core.md C7.10
 * `deps-refresh`). A manifest is hashed and compared with the last successful
 * run, so an unchanged `bun.lock` or `mise.toml` costs one file read. The state
 * lives in the shared Git info directory, not in the worktree.
 *
 * Install failures are reported but do not fail the hook: post-checkout and
 * post-merge are advisory, and the next `just install` repairs the checkout.
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { EXIT } from './lib/exit.mjs';
import { isMain } from './lib/proc.mjs';

const DEFAULT_MANIFESTS = ['mise.toml', 'bun.lock'];

/** The command that refreshes a manifest, or null when there is nothing to do. */
export function plan(manifest, root) {
  const name = basename(manifest);
  const directory = dirname(resolve(root, manifest));
  if (name === 'mise.toml') return { command: ['mise', 'install'], cwd: root };
  if (name === 'bun.lock' || name === 'bun.lockb') {
    return {
      command: ['mise', 'exec', '--', 'bun', 'install', '--frozen-lockfile', '--ignore-scripts'],
      cwd: directory,
    };
  }
  return null;
}

function git(root, ...args) {
  const result = spawnSync('git', ['-C', root, ...args], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
    windowsHide: true,
  });
  if (result.status !== 0) return null;
  const value = (result.stdout ?? '').trim();
  return value.length > 0 ? value : null;
}

function readState(path) {
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf8'));
    if (parsed === null || typeof parsed !== 'object') return {};
    const state = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (value !== null && typeof value === 'object' && typeof value.hash === 'string') {
        state[key] = { hash: value.hash };
      }
    }
    return state;
  } catch {
    return {};
  }
}

export function run(argv) {
  const manifests = argv.length > 0 ? argv : DEFAULT_MANIFESTS;
  const root = git('.', 'rev-parse', '--show-toplevel');
  if (root === null) {
    console.error('deps-refresh: not inside a Git worktree');
    return EXIT.OK;
  }
  const info = git(root, 'rev-parse', '--path-format=absolute', '--git-path', 'info');
  if (info === null) {
    console.error('deps-refresh: could not locate the Git info directory');
    return EXIT.OK;
  }
  const statePath = join(info, 'hook-deps-state.json');
  const state = readState(statePath);
  let changed = false;

  for (const manifest of manifests) {
    const absolute = resolve(root, manifest);
    if (!existsSync(absolute)) continue;
    const hash = createHash('sha256').update(readFileSync(absolute)).digest('hex');
    if (state[manifest]?.hash === hash) continue;
    const action = plan(manifest, root);
    if (action === null) continue;
    const [binary, ...rest] = action.command;
    if (binary === undefined) continue;
    console.log(`deps-refresh: ${manifest} changed; running ${action.command.join(' ')}`);
    const result = spawnSync(binary, rest, { cwd: action.cwd, stdio: 'inherit', windowsHide: true });
    if (result.error !== undefined || result.status !== 0) {
      console.error(`deps-refresh: ${action.command.join(' ')} failed; run \`just install\` by hand.`);
      continue;
    }
    state[manifest] = { hash };
    changed = true;
  }

  if (changed) {
    try {
      writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`);
    } catch {
      console.error(`deps-refresh: could not write ${statePath}`);
    }
  }
  return EXIT.OK;
}

if (isMain(import.meta.url)) process.exit(run(process.argv.slice(2)));
