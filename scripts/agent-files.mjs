#!/usr/bin/env node
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkScripting } from './check-standard.mjs';
import { isMain } from './lib/proc.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// Check the .agents/skills tree and its relative .claude/skills links without
// running the rest of the tree-local standard check.
export function checkAgentFiles(root = ROOT) {
  const gaps = [];
  checkScripting(root, (id, message) => {
    if (id.startsWith('scripting/skill-')) gaps.push({ id, message });
  });
  for (const gap of gaps) process.stdout.write(`gap ${gap.id}: ${gap.message}\n`);
  process.stdout.write(`agent-files: ${gaps.length === 0 ? 'ok' : `${gaps.length} gap(s)`}\n`);
  return gaps.length === 0 ? 0 : 1;
}

if (isMain(import.meta.url)) process.exit(checkAgentFiles());
