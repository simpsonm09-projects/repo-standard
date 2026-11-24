#!/usr/bin/env node
// Run every test suite and exit non-zero if any fails. One entry point so
// `just test`, the `mise` task, and verify.mjs all run the same set.
//
// Usage:
//   node scripts/test.mjs

import { EXIT } from './lib/exit.mjs';
import { scrubGitEnv } from './lib/git-env.mjs';
import { isMain, run } from './lib/proc.mjs';
import { runTest as runAllChecks } from './all-checks.test.mjs';
import { runTest as runCheckStandard } from './check-standard.test.mjs';
import { runTest as runEnv } from './env.test.mjs';
import { runTest as runPatchCoverage } from './patch-coverage.test.mjs';
import { runTest as runPrePush } from './pre-push.test.mjs';
import { runTest as runProc } from './proc.test.mjs';
import { runTest as runRepoMaintenance } from './repo-maintenance.test.mjs';
import { runTest as runRequired } from './required.test.mjs';
import { runTest as runRulesetPolicy } from './ruleset-policy.test.mjs';
import { runTest as runScripting } from './scripting.test.mjs';
import { runTest as runSubprocess } from './subprocess.test.mjs';
import { runTest as runDeliveryReceipt } from '../tools/delivery-receipt/receipt.test.mjs';

const SUITES = [
  runAllChecks,
  runCheckStandard,
  runPatchCoverage,
  runPrePush,
  runProc,
  runRepoMaintenance,
  runRequired,
  runRulesetPolicy,
  runScripting,
  runEnv,
  runSubprocess,
  runDeliveryReceipt,
];

export function runTests() {
  // A hook exports GIT_DIR; a suite that builds throwaway repositories must not
  // inherit it, or it would commit into the caller's checkout.
  scrubGitEnv();
  let failed = false;
  for (const suite of SUITES) {
    if (suite() !== EXIT.OK) failed = true;
  }
  if (run(process.execPath, ['scripts/ruleset-payload.mjs', '--self-test']) !== EXIT.OK) failed = true;
  return failed ? EXIT.FAIL : EXIT.OK;
}

if (isMain(import.meta.url)) process.exit(runTests());
