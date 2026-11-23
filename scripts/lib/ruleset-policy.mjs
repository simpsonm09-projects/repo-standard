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
