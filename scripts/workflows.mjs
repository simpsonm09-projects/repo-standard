#!/usr/bin/env node
// actionlint and zizmor over the given workflow files, or every workflow when
// none are given (core.md C7.10). A repository with no workflows exits 0.
import { existsSync } from 'node:fs';
import { EXIT } from './lib/exit.mjs';
import { isMain, run, which } from './lib/proc.mjs';

export function runWorkflows(files = []) {
  const targets = files.length > 0 ? files : ['.github/workflows'];
  if (!existsSync(targets[0])) {
    console.log('workflows: no workflow files to check');
    return EXIT.OK;
  }
  if (!which('mise')) {
    console.log('skip: actionlint and zizmor need mise. Install it from https://mise.run, then run `mise install`.');
    return EXIT.OK;
  }
  const actionlint = run('mise', ['exec', '--', 'actionlint', ...(files.length > 0 ? ['--', ...files] : [])]);
  if (actionlint !== EXIT.OK) return actionlint;
  return run('mise', ['exec', '--', 'zizmor', '--quiet', ...targets]);
}

if (isMain(import.meta.url)) process.exit(runWorkflows(process.argv.slice(2)));
