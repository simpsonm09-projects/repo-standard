#!/usr/bin/env node
// Owner hook (standards/owner.md): the protect-main ruleset requires signed
// commits (C2.7), so a checkout that cannot sign fails before the commit. Read
// the effective Git configuration; never change it.
import { spawnSync } from 'node:child_process';
import { EXIT } from './lib/exit.mjs';
import { isMain } from './lib/proc.mjs';

function config(key) {
  const result = spawnSync('git', ['config', '--get', key], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
    windowsHide: true,
  });
  if (result.status !== 0) return null;
  const value = (result.stdout ?? '').trim();
  return value.length > 0 ? value : null;
}

export function signingCheck() {
  const enabled = config('commit.gpgsign');
  const key = config('user.signingkey');
  const problems = [];
  if (enabled !== 'true') problems.push('commit.gpgsign is not true');
  if (key === null) problems.push('user.signingkey is unset');
  if (problems.length === 0) {
    console.log('signing-check: this checkout signs commits');
    return EXIT.OK;
  }
  console.error(`signing-check: ${problems.join('; ')}.`);
  console.error('signing-check: configure SSH signing for this checkout before committing (C2.7).');
  return EXIT.FAIL;
}

if (isMain(import.meta.url)) process.exit(signingCheck());
