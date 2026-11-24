#!/usr/bin/env bun
/**
 * Fast pre-push subset (core.md C7.10 `pre-push-check`). It runs the same
 * `just` recipes the required pull-request checks run, so CI confirms what the
 * hook already caught instead of running a second, slower suite (C5.7).
 *
 * Every recipe here must stay inside the 30-second pre-push budget. The slow
 * work — Trivy, aislop, the changed-line coverage gate — is a CI-only required
 * check or runs on `main` and the weekly schedule (C5.4).
 *
 * `fmt-check`, `lint` and `test` are contract recipes (C7.5) and must exist.
 * `typecheck` and `spec-check` are optional: a repository that does not define
 * one skips it.
 */

import { spawnSync } from 'node:child_process';

const REQUIRED = ['fmt-check', 'lint', 'test'];
const OPTIONAL = ['typecheck', 'spec-check'];

function definedRecipes(): Set<string> {
  const result = spawnSync('just', ['--summary'], { encoding: 'utf8', windowsHide: true });
  if (result.status !== 0) {
    throw new Error(`just --summary failed: ${(result.stderr ?? '').trim()}`);
  }
  return new Set((result.stdout ?? '').split(/\s+/u).filter(Boolean));
}

export function recipesToRun(defined: ReadonlySet<string>): string[] {
  const missing = REQUIRED.filter((recipe) => !defined.has(recipe));
  if (missing.length > 0) {
    throw new Error(`missing contract recipe(s): ${missing.join(', ')}`);
  }
  return [...REQUIRED, ...OPTIONAL.filter((recipe) => defined.has(recipe))];
}

function main(): number {
  for (const recipe of recipesToRun(definedRecipes())) {
    const result = spawnSync('just', [recipe], { stdio: 'inherit', windowsHide: true });
    if (result.status !== 0) return result.status ?? 1;
  }
  return 0;
}

if (import.meta.main) {
  process.exit(main());
}
