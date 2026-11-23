#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { chmodSync, copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isMain } from './lib/proc.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TEMPLATE = join(ROOT, 'templates', 'hooks', 'pre-push');

// Copy the guarded pre-push hook into this clone's hooks directory.
export function installHooks(root = ROOT) {
  const hooksDir = execFileSync('git', ['-C', root, 'rev-parse', '--git-path', 'hooks'], {
    encoding: 'utf8',
    windowsHide: true,
  }).trim();
  const dest = resolve(root, hooksDir);
  mkdirSync(dest, { recursive: true });
  const target = join(dest, 'pre-push');
  copyFileSync(TEMPLATE, target);
  if (process.platform !== 'win32') chmodSync(target, 0o755);
  process.stdout.write(`installed ${target}\n`);
  return 0;
}

if (isMain(import.meta.url)) process.exit(installHooks());
