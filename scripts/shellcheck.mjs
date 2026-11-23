#!/usr/bin/env node
// shellcheck over the given scripts; nothing to do when none are given
// (core.md C7.10).
import { EXIT } from './lib/exit.mjs';
import { isMain, run, which } from './lib/proc.mjs';

export function runShellcheck(files = []) {
  if (files.length === 0) {
    console.log('shellcheck: no files to check');
    return EXIT.OK;
  }
  if (!which('mise')) {
    console.log('skip: shellcheck needs mise. Install it from https://mise.run, then run `mise install`.');
    return EXIT.OK;
  }
  return run('mise', ['exec', '--', 'shellcheck', '--', ...files]);
}

if (isMain(import.meta.url)) process.exit(runShellcheck(process.argv.slice(2)));
