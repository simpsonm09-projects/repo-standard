#!/usr/bin/env node
import { EXIT } from './lib/exit.mjs';
import { isMain, run, which } from './lib/proc.mjs';

export function runLint(argv = []) {
  const fix = argv.includes('--fix');
  if (!which('mise')) {
    console.log('skip: the linters need mise. Install it from https://mise.run, then run `mise install`.');
    return EXIT.OK;
  }
  const js = run('mise', ['exec', '--', 'oxlint', '.', ...(fix ? ['--fix'] : [])]);
  if (js !== EXIT.OK) return js;
  return run('mise', ['exec', '--', 'flint', 'run', fix ? '--fix' : '--full']);
}

if (isMain(import.meta.url)) process.exit(runLint(process.argv.slice(2)));
