#!/usr/bin/env node
// Print the squash-only ruleset payload for one repository.
//
// Usage:
//   node scripts/ruleset-payload.mjs <ruleset.json> [--repo <owner/name>]
//   node scripts/ruleset-payload.mjs --self-test

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadExceptions } from './lib/exceptions.mjs';
import { COVERAGE_CONTEXT, kindOf } from './lib/required.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const EXCEPTIONS = join(HERE, '..', 'docs', 'exceptions.json');

export function buildPayload(ruleset, kind = 'covered') {
  const payload = JSON.parse(JSON.stringify(ruleset));
  if (payload.name === 'protect-main') setCoverageContext(payload, kind);
  payload.bypass_actors = [];
  const rule = (payload.rules ?? []).find((entry) => entry?.type === 'pull_request');
  if (rule) setPullRequestPolicy(rule);
  return payload;
}

// Zero required reviews, squash merges only, and no bypass actors.
function setPullRequestPolicy(rule) {
  if (!rule.parameters) throw new Error('the pull_request rule must carry parameters');
  rule.parameters.required_approving_review_count = 0;
  rule.parameters.allowed_merge_methods = ['squash'];
}

// The committed file lists the checks every repository reports. Only a covered
// repository also requires coverage, so the kind adds or removes that one context.
function setCoverageContext(payload, kind) {
  const rule = (payload.rules ?? []).find((entry) => entry.type === 'required_status_checks');
  if (!rule?.parameters) return;
  const others = (rule.parameters.required_status_checks ?? []).filter((entry) => entry.context !== COVERAGE_CONTEXT);
  rule.parameters.required_status_checks = kind === 'covered' ? [...others, { context: COVERAGE_CONTEXT }] : others;
}

function parseArgs(argv) {
  const args = { file: undefined, repo: undefined, selfTest: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--repo') {
      index += 1;
      args.repo = argv[index];
    } else if (arg === '--self-test') args.selfTest = true;
    else if (!args.file) args.file = arg;
  }
  return args;
}

function selfTest() {
  const assert = (condition, message) => {
    if (!condition) throw new Error(message);
  };
  const protect = {
    name: 'protect-main',
    bypass_actors: [{ actor_type: 'Integration', actor_id: 42 }],
    rules: [
      { type: 'pull_request', parameters: { required_approving_review_count: 2, allowed_merge_methods: ['merge'] } },
      { type: 'required_status_checks', parameters: { required_status_checks: [{ context: 'test' }] } },
    ],
  };
  const built = buildPayload(protect);
  assert(built.rules[0].parameters.required_approving_review_count === 0, 'the payload requires zero approvals');
  assert(built.rules[0].parameters.allowed_merge_methods.join(',') === 'squash', 'the payload allows squash only');
  assert(built.bypass_actors.length === 0, 'the payload strips every bypass actor');
  const tags = buildPayload({
    name: 'protect-tags',
    bypass_actors: [{ actor_type: 'OrganizationAdmin' }],
    rules: [{ type: 'deletion' }],
  });
  assert(
    tags.name === 'protect-tags' && tags.bypass_actors.length === 0,
    'tag protection is untouched except for the bypass list',
  );
  assert(tags.rules.length === 1 && tags.rules[0].type === 'deletion', 'tag protection keeps its rules');
}

// The required contexts of the protect-main payload, in order.
function contextsOf(payload) {
  const rule = (payload.rules ?? []).find((entry) => entry.type === 'required_status_checks');
  return (rule?.parameters?.required_status_checks ?? []).map((entry) => entry.context);
}

function selfTestKinds() {
  const assert = (condition, message) => {
    if (!condition) throw new Error(message);
  };
  const base = {
    name: 'protect-main',
    rules: [
      { type: 'pull_request', parameters: {} },
      {
        type: 'required_status_checks',
        parameters: { required_status_checks: [{ context: 'lint / flint' }, { context: 'test' }] },
      },
    ],
  };

  const covered = buildPayload(base, 'covered');
  assert(contextsOf(covered).includes(COVERAGE_CONTEXT), 'a covered repository requires coverage');
  assert(contextsOf(covered).includes('test'), 'a covered repository keeps the base checks');

  const uncovered = buildPayload(covered, 'uncovered');
  assert(!contextsOf(uncovered).includes(COVERAGE_CONTEXT), 'an uncovered repository does not require coverage');
  assert(
    contextsOf(uncovered).join(',') === 'lint / flint,test',
    'an uncovered repository keeps exactly the base checks',
  );

  assert(
    contextsOf(buildPayload(base)).includes(COVERAGE_CONTEXT),
    'without a kind the payload is for a covered repository',
  );
  assert(
    contextsOf(buildPayload(covered, 'covered')).filter((c) => c === COVERAGE_CONTEXT).length === 1,
    'a covered repository never duplicates coverage',
  );

  const tags = buildPayload({ name: 'protect-tags', rules: base.rules }, 'uncovered');
  assert(
    contextsOf(tags).includes(COVERAGE_CONTEXT) === false && contextsOf(tags).length === 2,
    'protect-tags is untouched',
  );
}

function runSelfTest() {
  try {
    selfTest();
    selfTestKinds();
    process.stdout.write('ruleset-payload: self-test ok\n');
  } catch (error) {
    process.stderr.write(`ruleset-payload: self-test failed: ${error.message}\n`);
    process.exit(1);
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.selfTest) {
    runSelfTest();
    return;
  }
  if (!args.file) {
    process.stderr.write('usage: ruleset-payload <ruleset.json> [--repo <owner/name>]\n');
    process.exit(2);
  }
  const ruleset = JSON.parse(readFileSync(args.file, 'utf8'));
  const kind = args.repo ? kindOf(loadExceptions(EXCEPTIONS), args.repo) : 'covered';
  try {
    process.stdout.write(`${JSON.stringify(buildPayload(ruleset, kind), null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`ruleset-payload: ${error.message}\n`);
    process.exit(2);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
