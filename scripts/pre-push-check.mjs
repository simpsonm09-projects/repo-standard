#!/usr/bin/env node
// Fast pre-push subset (core.md C7.10): the same recipes the required
// pull-request checks run, so CI confirms what the hook already caught (C5.7)
// instead of running a second, slower suite. Everything here finishes in a few
// seconds; the slow scans stay in CI on `main` and the weekly schedule (C5.4).
import { EXIT } from './lib/exit.mjs';
import { isMain, run, which } from './lib/proc.mjs';

// `fmt-check` and `lint` are the two recipes CI runs in their own jobs; the
// test suite is the third.
const RECIPES = ['fmt-check', 'lint'];

export function runPrePushCheck() {
  for (const recipe of RECIPES) {
    const code = run('just', [recipe]);
    if (code !== EXIT.OK) return code;
  }
  if (which('bun')) {
    const check = run('bun', ['check']);
    if (check !== EXIT.OK) return check;
  }
  const test = run(process.execPath, ['scripts/test.mjs']);
  if (test !== EXIT.OK) return test;
  return run(process.execPath, ['scripts/op.mjs', 'check']);
}

if (isMain(import.meta.url)) process.exit(runPrePushCheck());
