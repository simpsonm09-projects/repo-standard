export const SELECTABLE_LEVELS = Object.freeze(['propose', 'merge', 'full']);

// Every access level requires zero reviews and no bypass actors. A pull request
// is still required: protect-main carries the pull_request rule, and signed
// commits and the required status checks are never affected by the level.
export function approvalCountFor(level) {
  if (level === 'propose' || level === 'merge' || level === 'full') return 0;
  throw new Error(`unsupported agent access level: ${String(level)}`);
}

export function compareMainRulesets(level, protectMain, branch = 'main') {
  const errors = [];
  try {
    approvalCountFor(level);
  } catch (error) {
    return [`unknown or unsupported level ${String(level)}: ${error.message}`];
  }

  checkRulesetTarget(protectMain, 'protect-main', branch, errors);
  if (protectMain) {
    const actors = protectMain.bypass_actors;
    if (!Array.isArray(actors)) errors.push('protect-main bypass actors are unreadable');
    else if (actors.length !== 0) errors.push('protect-main has bypass actors; expected none');
  }
  checkApprovalRule(protectMain, 0, 'protect-main', errors);
  return errors;
}

export function findUniqueRuleset(summaries, name) {
  if (!Array.isArray(summaries)) return { ok: false, reason: 'ruleset list is unreadable' };
  const found = summaries.filter((entry) => entry?.name === name);
  if (found.length !== 1) return { ok: false, reason: `expected one ${name}, found ${found.length}` };
  return { ok: true, summary: found[0] };
}

function checkRulesetTarget(ruleset, name, branch, errors) {
  if (!ruleset) {
    errors.push(`${name} is missing or unreadable`);
    return;
  }
  if (ruleset.name !== name) errors.push(`ruleset name is ${String(ruleset.name)}, expected ${name}`);
  if (ruleset.target !== 'branch') errors.push(`${name} target is ${String(ruleset.target)}, expected branch`);
  if (ruleset.enforcement !== 'active')
    errors.push(`${name} enforcement is ${String(ruleset.enforcement)}, expected active`);
  const includes = ruleset.conditions?.ref_name?.include;
  const excludes = ruleset.conditions?.ref_name?.exclude;
  if (
    !Array.isArray(includes) ||
    includes.length !== 1 ||
    includes[0] !== `refs/heads/${branch}` ||
    !Array.isArray(excludes) ||
    excludes.length !== 0
  ) {
    errors.push(`${name} does not target exactly refs/heads/${branch}`);
  }
}

export function rulesetTargetErrors(ruleset, name, branch = 'main') {
  const errors = [];
  checkRulesetTarget(ruleset, name, branch, errors);
  return errors;
}

function checkApprovalRule(ruleset, expected, name, errors) {
  if (!ruleset) return;
  const rules = ruleset.rules;
  if (!Array.isArray(rules)) {
    errors.push(`${name} rules are unreadable`);
    return;
  }
  const reviews = rules.filter((entry) => entry?.type === 'pull_request');
  if (reviews.length !== 1) {
    errors.push(`${name} expected one pull_request rule, found ${reviews.length}`);
    return;
  }
  const count = reviews[0]?.parameters?.required_approving_review_count;
  if (!Number.isInteger(count)) errors.push(`${name} approval count is unreadable`);
  else if (count !== expected) errors.push(`${name} approval count is ${count}, expected ${expected}`);
}
