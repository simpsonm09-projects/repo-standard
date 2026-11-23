#!/usr/bin/env node
// Fast pre-push subset (core.md C7.10): the type check and the operation
// manifest check. The full suite stays in `just test` and CI.
import { EXIT } from './lib/exit.mjs';
import { isMain, run, which } from './lib/proc.mjs';

export function runPrePushCheck() {
  if (which('bun')) {
    const check = run('bun', ['check']);
    if (check !== EXIT.OK) return check;
  }
  return run(process.execPath, ['scripts/op.mjs', 'check']);
}

if (isMain(import.meta.url)) process.exit(runPrePushCheck());
