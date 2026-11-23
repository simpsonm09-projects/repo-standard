#!/usr/bin/env node
import { EXIT } from './lib/exit.mjs';
import { isMain, run, which } from './lib/proc.mjs';

// Lint the given files, or every linter over the tracked tree when none are
// given (core.md C7.10). Lefthook passes the staged JavaScript and TypeScript
// files; flint is the whole-repository aggregator.
export function runLint(argv = []) {
  const fix = argv.includes('--fix');
  const files = argv.filter((arg) => !arg.startsWith('-'));
  if (!which('mise')) {
    console.log('skip: the linters need mise. Install it from https://mise.run, then run `mise install`.');
    return EXIT.OK;
  }
  if (files.length > 0) {
    return run('mise', ['exec', '--', 'oxlint', ...(fix ? ['--fix'] : []), '--', ...files]);
  }
  const js = run('mise', ['exec', '--', 'oxlint', '.', ...(fix ? ['--fix'] : [])]);
  if (js !== EXIT.OK) return js;
  return run('mise', ['exec', '--', 'flint', 'run', fix ? '--fix' : '--full']);
}

if (isMain(import.meta.url)) process.exit(runLint(process.argv.slice(2)));
