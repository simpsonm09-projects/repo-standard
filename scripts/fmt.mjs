#!/usr/bin/env node
// Format the given files, or the whole repository when none are given
// (core.md C7.10). Lefthook passes every staged file the shared glob matches;
// files Bun cannot parse are skipped so the hook does not fail on them.
import { extname } from 'node:path';
import { EXIT } from './lib/exit.mjs';
import { isMain, run } from './lib/proc.mjs';

const SUPPORTED = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.mts',
  '.cts',
  '.json',
  '.jsonc',
  '.yml',
  '.yaml',
  '.md',
  '.toml',
  '.css',
  '.html',
]);

export function runFmt(files = []) {
  if (files.length === 0) return run('bun', ['fmt', 'scripts', 'tools']);
  const supported = files.filter((file) => SUPPORTED.has(extname(file).toLowerCase()));
  if (supported.length === 0) {
    console.log('fmt: no formattable files');
    return EXIT.OK;
  }
  return run('bun', ['fmt', '--', ...supported]);
}

if (isMain(import.meta.url)) process.exit(runFmt(process.argv.slice(2)));
