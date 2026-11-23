#!/usr/bin/env node
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { applySettings } from './apply-settings.mjs';
import { compareMainRulesets, findUniqueRuleset } from './lib/ruleset-policy.mjs';
import { buildPayload } from './ruleset-payload.mjs';
import { compare } from './check-agent-access.mjs';
import { EXIT } from './lib/exit.mjs';

const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function ruleset(name, count, actors = []) {
  return {
    name,
    target: 'branch',
    enforcement: 'active',
    conditions: { ref_name: { include: ['refs/heads/main'], exclude: [] } },
    bypass_actors: actors,
    rules: [{ type: 'pull_request', parameters: { required_approving_review_count: count } }],
  };
}

function testRulesets() {
  const admin = [{ actor_id: null, actor_type: 'OrganizationAdmin', bypass_mode: 'pull_request' }];
  const protect = ruleset('protect-main', 0);
  assert(compareMainRulesets('propose', protect).length === 0, 'propose policy passes');
  assert(compareMainRulesets('merge', protect).length === 0, 'merge policy passes');
  assert(compareMainRulesets('full', protect).length === 0, 'full policy passes');
  assert(
    compareMainRulesets('propose', ruleset('protect-main', 1)).some((item) => item.includes('expected 0')),
    'a required approval fails',
  );
  assert(compareMainRulesets('legacy', protect).length > 0, 'unknown level fails');
  assert(
    compareMainRulesets('full', { ...protect, bypass_actors: admin }).some((item) =>
      item.includes('protect-main has bypass'),
    ),
    'any bypass actor fails',
  );
  assert(
    compareMainRulesets('full', { ...protect, bypass_actors: undefined }).some((item) => item.includes('unreadable')),
    'unreadable bypass list fails',
  );
  assert(
    compareMainRulesets('full', null).some((item) => item.includes('missing or unreadable')),
    'missing ruleset fails',
  );
  assert(
    compareMainRulesets('full', { ...protect, enforcement: 'disabled' }).some((item) =>
      item.includes('expected active'),
    ),
    'inactive ruleset fails',
  );
  assert(
    compareMainRulesets('full', {
      ...protect,
      conditions: { ref_name: { include: ['refs/heads/release'], exclude: [] } },
    }).some((item) => item.includes('does not target exactly')),
    'wrong branch target fails',
  );
  assert(
    compareMainRulesets('full', { ...protect, rules: [] }).some((item) => item.includes('expected one pull_request')),
    'missing pull_request rule fails',
  );
  assert(
    compareMainRulesets('full', { ...protect, rules: [...protect.rules, ...protect.rules] }).some((item) =>
      item.includes('found 2'),
    ),
    'duplicate pull_request rules fail',
  );
  assert(compare('example', 'merge', protect).ok, 'checker accepts the expected merge ruleset');
  assert(!compare('example', 'full', { ...protect, bypass_actors: admin }).ok, 'checker rejects a bypass actor');
  assert(
    !findUniqueRuleset([{ name: 'protect-main' }, { name: 'protect-main' }], 'protect-main').ok,
    'duplicate rulesets fail',
  );

  const built = buildPayload(
    {
      ...protect,
      bypass_actors: admin,
      rules: [
        {
          type: 'pull_request',
          parameters: { required_approving_review_count: 3, allowed_merge_methods: ['merge', 'rebase'] },
        },
        { type: 'required_status_checks', parameters: { required_status_checks: [] } },
      ],
    },
    'full',
  );
  assert(built.bypass_actors.length === 0, 'the payload strips every bypass actor');
  assert(built.rules[0].parameters.required_approving_review_count === 0, 'the payload requires zero approvals');
  assert(built.rules[0].parameters.allowed_merge_methods.join(',') === 'squash', 'the payload allows squash only');

  const committedProtect = JSON.parse(readFileSync(new URL('../rulesets/protect-main.json', import.meta.url), 'utf8'));
  const contexts = committedProtect.rules
    .find((entry) => entry.type === 'required_status_checks')
    .parameters.required_status_checks.map((entry) => entry.context);
  const pullRequest = committedProtect.rules.find((entry) => entry.type === 'pull_request');
  assert(
    committedProtect.rules.some((entry) => entry.type === 'required_signatures'),
    'protect-main keeps required signatures',
  );
  assert(pullRequest.parameters.required_approving_review_count === 0, 'protect-main carries zero approval count');
  assert(pullRequest.parameters.allowed_merge_methods.join(',') === 'squash', 'protect-main allows squash only');
  assert(committedProtect.bypass_actors.length === 0, 'committed protect-main has no bypass actors');
  assert(
    contexts.includes('test') && contexts.includes('security / secrets') && !contexts.includes('all-checks'),
    'existing hard checks remain and no unreported aggregate is required',
  );
  assert(
    !existsSync(new URL('../rulesets/approval-main.json', import.meta.url)),
    'the second main ruleset payload is retired',
  );
}

function mockedApi(meta, calls) {
  return (args) => {
    calls.push(args);
    if (args[0] === '-X' && args[1] === 'PATCH') return { ok: true, value: null };
    const path = args.find((part) => typeof part === 'string' && part.startsWith('repos/'));
    if (path?.endsWith('/vulnerability-alerts')) return { ok: true, value: null };
    if (path?.endsWith('/automated-security-fixes')) return { ok: true, value: { enabled: true } };
    if (path?.endsWith('/topics')) return { ok: true, value: { names: ['simpsonm09-projects'] } };
    return { ok: true, value: meta };
  };
}

function settingsApi(meta, outcomes, calls) {
  return (args) => {
    calls.push(args);
    if (args[0] === '-X' && args[1] === 'PATCH') {
      const isAutoMerge = args.includes('allow_auto_merge=true') || args.includes('allow_auto_merge=false');
      return outcomes[isAutoMerge ? 'autoMerge' : 'settings'] ?? { ok: true, value: null };
    }
    if (meta === null) return { ok: false, error: 'metadata unavailable' };
    if (meta === 'unreadable') return { ok: true, value: null };
    return { ok: true, value: meta };
  };
}

function testAutoMergeSettings() {
  const desiredSettings = {
    delete_branch_on_merge: true,
    allow_merge_commit: false,
    allow_squash_merge: true,
    allow_rebase_merge: false,
    visibility: 'private',
    allow_auto_merge: false,
  };
  const dryCalls = [];
  const dry = applySettings(
    'simpsonm09-projects/example',
    { topics: [], allowAutoMerge: true },
    false,
    mockedApi(desiredSettings, dryCalls),
  );
  assert(dry.errors.length === 0, 'dry run reports no errors');
  assert(
    dry.changes.includes('simpsonm09-projects/example allow_auto_merge -> true'),
    'explicit auto-merge on is reported',
  );
  assert(!dryCalls.some((args) => args[0] === '-X' && args[1] === 'PATCH'), 'dry run does not write');

  const applyCalls = [];
  const applied = applySettings(
    'simpsonm09-projects/example',
    { topics: [], allowAutoMerge: true },
    true,
    mockedApi(
      {
        ...desiredSettings,
        delete_branch_on_merge: false,
        allow_merge_commit: true,
        allow_rebase_merge: true,
        allow_squash_merge: false,
      },
      applyCalls,
    ),
  );
  const settingsPatch = applyCalls.find((args) => args.includes('delete_branch_on_merge=true'));
  assert(applied.errors.length === 0 && settingsPatch, 'apply sends the settings patch');
  assert(
    settingsPatch.includes('allow_merge_commit=false') && settingsPatch.includes('allow_rebase_merge=false'),
    'the patch disables merge and rebase commits',
  );
  assert(settingsPatch.includes('allow_squash_merge=true'), 'the patch keeps squash merges');

  const offCalls = [];
  applySettings(
    'simpsonm09-projects/example',
    { topics: [], allowAutoMerge: false },
    true,
    mockedApi({ ...desiredSettings, allow_auto_merge: true }, offCalls),
  );
  assert(
    offCalls.some((args) => args.includes('allow_auto_merge=false')),
    'explicit off is honored',
  );

  const noPolicyCalls = [];
  const noPolicy = applySettings(
    'simpsonm09-projects/example',
    { topics: [] },
    false,
    mockedApi({ ...desiredSettings, allow_auto_merge: true }, noPolicyCalls),
  );
  assert(
    !noPolicy.changes.some((change) => change.includes('allow_auto_merge')),
    'an unspecified auto-merge setting is not changed',
  );

  const metadataFailureCalls = [];
  const metadataFailure = applySettings(
    'simpsonm09-projects/example',
    { topics: [], allowAutoMerge: true },
    true,
    settingsApi(null, {}, metadataFailureCalls),
  );
  assert(
    metadataFailure.errors.some((error) => error.includes('settings') && error.includes('metadata unavailable')),
    'a metadata read failure is reported',
  );
  assert(
    !metadataFailureCalls.some((args) => args[0] === '-X' && args[1] === 'PATCH'),
    'a metadata read failure does not write',
  );

  const unreadableCalls = [];
  const unreadable = applySettings(
    'simpsonm09-projects/example',
    { topics: [], allowAutoMerge: true },
    true,
    settingsApi('unreadable', {}, unreadableCalls),
  );
  assert(
    unreadable.errors.some((error) => error.includes('unreadable metadata response body')),
    'an empty metadata body is reported',
  );
  assert(
    !unreadableCalls.some((args) => args[0] === '-X' && args[1] === 'PATCH'),
    'an empty metadata body does not write',
  );
}

function mockGhSource() {
  return `
import { appendFileSync } from 'node:fs';
const args = process.argv.slice(2);
const scenario = process.env.POLICY_SCENARIO;
if (process.env.POLICY_CALL_LOG) appendFileSync(process.env.POLICY_CALL_LOG, args.join(' ') + '\\n');
function fail(message) { process.stderr.write(message); process.exit(1); }
if (args[0] === '--version') {
  if (scenario === 'missing-gh') fail('gh is unavailable in this fixture');
  process.stdout.write('gh mock\\n'); process.exit(0);
}
const endpoint = args.at(-1);
if (endpoint === 'repos/simpsonm09-projects/example') {
  if (scenario === 'metadata-error') fail('mock metadata failure');
  if (scenario === 'metadata-empty') process.exit(0);
  if (scenario === 'metadata-null') { process.stdout.write('null'); process.exit(0); }
  if (scenario === 'metadata-array') { process.stdout.write('[]'); process.exit(0); }
  if (scenario === 'metadata-scalar') { process.stdout.write('7'); process.exit(0); }
  process.stdout.write(JSON.stringify({ visibility: scenario === 'private' ? 'private' : 'public', default_branch: 'main', description: 'fixture' }));
} else if (endpoint === 'repos/simpsonm09-projects/example/topics') {
  process.stdout.write(JSON.stringify({ names: ['simpsonm09-projects'] }));
} else if (endpoint === 'repos/simpsonm09-projects/example/rulesets') {
  if (scenario === 'ruleset-list-error') fail('mock ruleset list failure');
  if (scenario === 'ruleset-list-empty') process.exit(0);
  if (scenario === 'ruleset-list-null') { process.stdout.write('null'); process.exit(0); }
  if (scenario === 'ruleset-list-object') { process.stdout.write('{}'); process.exit(0); }
  if (scenario === 'ruleset-list-array') { process.stdout.write('[{}]'); process.exit(0); }
  process.stdout.write(JSON.stringify([[{ id: 1, name: 'protect-main' }]]));
} else if (endpoint.endsWith('/rulesets/1')) {
  if (scenario === 'detail-error') fail('mock detail failure');
  if (scenario === 'detail-empty') process.exit(0);
  if (scenario === 'detail-null') { process.stdout.write('null'); process.exit(0); }
  if (scenario === 'detail-array') { process.stdout.write('[]'); process.exit(0); }
  if (scenario === 'detail-scalar') { process.stdout.write('7'); process.exit(0); }
  if (scenario === 'missing-required-checks') {
    process.stdout.write(JSON.stringify({ name: 'protect-main', target: 'branch', enforcement: 'active',
      conditions: { ref_name: { include: ['refs/heads/main'], exclude: [] } }, bypass_actors: [],
      rules: [{ type: 'required_signatures' }, { type: 'pull_request', parameters: { required_approving_review_count: 0 } },
        { type: 'required_status_checks', parameters: { required_status_checks: [] } }],
    }));
    process.exit(0);
  }
  if (scenario === 'broken-hard-protection') {
    process.stdout.write(JSON.stringify({ name: 'protect-main', target: 'tag', enforcement: 'disabled',
      conditions: { ref_name: { include: ['refs/heads/release'], exclude: [] } },
      bypass_actors: [{ actor_type: 'Integration', actor_id: 9, bypass_mode: 'always' }],
      rules: [{ type: 'required_status_checks', parameters: { required_status_checks: [] } }],
    }));
    process.exit(0);
  }
  const bypassActors = [];
  if (scenario === 'nonempty-protect-bypass') bypassActors.push({ actor_id: 9, actor_type: 'Integration', bypass_mode: 'always' });
  const response = {
    name: 'protect-main', target: 'branch', enforcement: 'active',
    conditions: { ref_name: { include: ['refs/heads/main'], exclude: [] } },
    ...(scenario !== 'omit-protect-bypass'
      ? { bypass_actors: scenario === 'invalid-protect-bypass' ? null : bypassActors } : {}),
    rules: [
      { type: 'required_signatures' },
      { type: 'pull_request', parameters: { required_approving_review_count: 0, allowed_merge_methods: ['squash'] } },
      { type: 'required_status_checks', parameters: { strict_required_status_checks_policy: true,
        required_status_checks: ['lint / flint', 'aislop / aislop', 'security / trivy', 'security / secrets', 'standard / standard', 'test', 'coverage / coverage'].map((context) => ({ context })) } },
    ],
  };
  process.stdout.write(JSON.stringify(response));
} else fail('unexpected mock endpoint: ' + endpoint);
`;
}

function makeGhFixture(directory) {
  const source = join(directory, 'gh.mjs');
  writeFileSync(source, mockGhSource());
  if (process.platform === 'win32') {
    writeFileSync(join(directory, 'gh.cmd'), `@"${process.execPath}" "${source}" %*\r\n`);
    return;
  }
  const executable = join(directory, 'gh');
  writeFileSync(executable, `#!/bin/sh\nexec "${process.execPath}" "${source}" "$@"\n`);
  chmodSync(executable, 0o755);
}

function runCheckRepoCli(args, path, scenario = '', repo = true) {
  const env = { ...process.env };
  for (const key of Object.keys(env)) if (key.toLowerCase() === 'path') delete env[key];
  env.PATH = [path, process.env.PATH ?? process.env.Path].filter(Boolean).join(delimiterForPath());
  env.POLICY_SCENARIO = scenario;
  const callLog = join(path, `gh-calls-${scenario || 'default'}.txt`);
  env.POLICY_CALL_LOG = callLog;
  env.PATHEXT = process.env.PATHEXT ?? '.COM;.EXE;.BAT;.CMD';
  delete env.GITHUB_REPOSITORY;
  const identityRoot = join(path, 'identity-root');
  if (!repo) mkdirSync(identityRoot, { recursive: true });
  const commandArgs = [
    'scripts/check-repo.mjs',
    repo ? '.' : identityRoot,
    ...(repo ? ['--repo', 'simpsonm09-projects/example'] : []),
    ...args,
  ];
  const result = spawnSync(process.execPath, commandArgs, {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    windowsHide: true,
    env,
  });
  result.fixtureCalls = existsSync(callLog) ? readFileSync(callLog, 'utf8') : '';
  return result;
}

function delimiterForPath() {
  return process.platform === 'win32' ? ';' : ':';
}

function expectPolicyGap(result, label, reason) {
  const count = (result.stdout.match(/gap ruleset\/approval-policy:/g) ?? []).length;
  assert(
    result.status === 1 && count === 1 && result.stdout.includes(reason),
    `${label} must fail with exactly one approval-policy gap containing ${reason}; got exit ${result.status}:\n${result.stdout}${result.stderr}\nfixture calls: ${result.fixtureCalls}`,
  );
}

function testRequiredContexts(bin, level) {
  const withLevel = runCheckRepoCli(level, bin, 'missing-required-checks');
  assert(
    withLevel.status === 1 && withLevel.stdout.includes('gap ruleset/required-missing:'),
    'a valid explicit level still reports missing required contexts',
  );
  const withoutLevel = runCheckRepoCli([], bin, 'missing-required-checks');
  assert(
    withoutLevel.status === 1 && (withoutLevel.stdout.match(/gap ruleset\/required-missing:/g) ?? []).length === 7,
    'without a level, the same corrupt required contexts produce all seven required-missing gaps and fail',
  );
}

function testBypassVisibility(bin, level) {
  const noLevel = runCheckRepoCli([], bin, 'omit-protect-bypass');
  assert(
    noLevel.status === 0 &&
      noLevel.stdout.includes('cannot verify protect-main bypass actors: GitHub omitted bypass_actors') &&
      noLevel.stdout.includes('UNVERIFIED') &&
      noLevel.stdout.includes('standard: ok (ruleset bypass visibility unverified)') &&
      !noLevel.stdout.includes('gap ruleset/protect-bypass') &&
      !noLevel.stdout.includes('gap ruleset/approval-policy'),
    `omitted protect-main bypass_actors is explicitly unverified without a level; got exit ${noLevel.status}:\n${noLevel.stdout}${noLevel.stderr}`,
  );
  const explicit = runCheckRepoCli(level, bin, 'omit-protect-bypass');
  assert(
    explicit.status === 1 &&
      explicit.stdout.includes('gap ruleset/approval-policy:') &&
      explicit.stdout.includes('protect-main bypass actors are unreadable'),
    'omitted protect-main bypass_actors fails closed with an explicit level',
  );
  for (const scenario of ['invalid-protect-bypass', 'nonempty-protect-bypass']) {
    const result = runCheckRepoCli([], bin, scenario);
    assert(
      result.status === 1 && result.stdout.includes('gap ruleset/protect-bypass:'),
      `readable ${scenario === 'invalid-protect-bypass' ? 'invalid' : 'nonempty'} protect-main bypass_actors remains a hard gap without a level`,
    );
  }
}

function testCheckRepoCliFailures() {
  const fixture = mkdtempSync(join(tmpdir(), 'check-repo-cli-'));
  try {
    const bin = join(fixture, 'bin');
    mkdirSync(bin);
    makeGhFixture(bin);
    const level = ['--agent-level', 'merge'];
    expectPolicyGap(runCheckRepoCli(level, bin, 'missing-gh'), 'gh missing', 'gh is not on PATH');
    const noLevelMissing = runCheckRepoCli([], bin, 'missing-gh');
    assert(
      noLevelMissing.stdout.includes('notice: gh is not on PATH') &&
        !noLevelMissing.stdout.includes('gap ruleset/approval-policy'),
      'missing gh without an explicit level is notice only',
    );
    expectPolicyGap(runCheckRepoCli([...level, '--no-api'], bin), '--no-api', 'API checks were disabled');
    for (const [scenario, label, reason] of [
      ['metadata-error', 'metadata read failure', 'cannot read repository metadata'],
      ['private', 'private repository', 'unsupported for private repositories'],
      ['ruleset-list-error', 'ruleset list failure', 'cannot read ruleset list'],
      ['detail-error', 'ruleset detail failure', 'cannot read protect-main detail'],
    ]) {
      const result = runCheckRepoCli(level, bin, scenario);
      expectPolicyGap(result, label, reason);
      assert(
        result.fixtureCalls.includes('repos/simpsonm09-projects/example'),
        `${label} fixture proves gh was invoked`,
      );
    }
    const missingIdentity = runCheckRepoCli(level, bin, 'success', false);
    expectPolicyGap(missingIdentity, 'missing identity', 'repository identity could not be determined');
    const success = runCheckRepoCli(level, bin, 'success');
    assert(
      success.status === 0 &&
        !success.stdout.includes('gap ruleset/approval-policy') &&
        !success.stdout.includes('gap ruleset/required-missing') &&
        !success.stdout.includes('notice: cannot read'),
      'a valid explicit-level API audit passes with hard checks present',
    );
    const successWithoutLevel = runCheckRepoCli([], bin, 'success');
    assert(
      successWithoutLevel.stdout.includes('protect-main approval count and bypass actors were not compared') &&
        !successWithoutLevel.stdout.includes('gap ruleset/approval-policy'),
      'a successful API read without a level remains notice only',
    );
    testBypassVisibility(bin, level);
    const noLevelNoApi = runCheckRepoCli(['--no-api'], bin);
    assert(!noLevelNoApi.stdout.includes('gap ruleset/approval-policy'), 'no-level --no-api does not add a policy gap');
    const invalid = runCheckRepoCli(['--agent-level', 'bogus'], bin, 'success');
    assert(
      invalid.status === 1 && (invalid.stdout.match(/gap ruleset\/approval-policy:/g) ?? []).length === 1,
      'unsupported level reports one gap',
    );
    const invalidWithoutApi = runCheckRepoCli(['--agent-level', 'bogus', '--no-api'], bin);
    assert(
      invalidWithoutApi.status === 1 &&
        (invalidWithoutApi.stdout.match(/gap ruleset\/approval-policy:/g) ?? []).length === 1,
      'unsupported level with API disabled does not duplicate its gap',
    );
    for (const scenario of [
      'detail-empty',
      'detail-null',
      'detail-array',
      'detail-scalar',
      'metadata-empty',
      'metadata-null',
      'metadata-array',
      'metadata-scalar',
      'ruleset-list-empty',
      'ruleset-list-null',
      'ruleset-list-object',
      'ruleset-list-array',
    ]) {
      const levelResult = runCheckRepoCli(level, bin, scenario);
      expectPolicyGap(levelResult, `${scenario} explicit`, 'cannot read');
      assert(
        levelResult.fixtureCalls.includes('repos/simpsonm09-projects/example'),
        `${scenario} explicit fixture proves gh was invoked`,
      );
      const noticeResult = runCheckRepoCli([], bin, scenario);
      assert(
        noticeResult.status === 0 && noticeResult.stdout.includes('notice: cannot read'),
        `${scenario} without a level remains notice-only and succeeds`,
      );
    }
    testRequiredContexts(bin, level);
    const brokenHardChecks = runCheckRepoCli(level, bin, 'broken-hard-protection');
    for (const id of [
      'ruleset/enforcement',
      'ruleset/main-target',
      'ruleset/required-missing',
      'ruleset/required-strict',
      'ruleset/protect-rule',
      'ruleset/protect-signatures',
      'ruleset/protect-bypass',
    ]) {
      assert(
        brokenHardChecks.status === 1 && brokenHardChecks.stdout.includes(`gap ${id}:`),
        `valid explicit level retains the ${id} hard check`,
      );
    }
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
}

export function runTest() {
  try {
    testRulesets();
    testCheckRepoCliFailures();
    testAutoMergeSettings();
    process.stdout.write('ruleset-policy: all assertions passed\n');
    return EXIT.OK;
  } catch (error) {
    process.stderr.write(`ruleset-policy: ${error.message}\n`);
    return EXIT.FAIL;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) process.exit(runTest());
