import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

function toChecks(value) {
  if (Array.isArray(value)) return value.filter((item) => typeof item === 'string');
  if (typeof value === 'string') return [value];
  return null;
}

export function loadExceptions(file) {
  if (!existsSync(file)) return [];
  const data = JSON.parse(readFileSync(file, 'utf8'));
  const list = Array.isArray(data) ? data : (data.exceptions ?? []);
  return list.map((entry) => {
    const raw = 'checks' in entry ? entry.checks : 'check' in entry ? entry.check : null;
    return {
      repo: entry.repo,
      checks: new Set(toChecks(raw) ?? []),
      reason: entry.reason ?? '',
      date: entry.date ?? '',
    };
  });
}

// The owner standard keeps a repository's tolerated gaps in its own
// docs/exceptions.md: one table row per rule with the rule id, the reason and a
// revisit date. A repository with that file owns its exceptions; the central
// JSON file remains the fallback for a repository that predates the local file.
export function loadRepoExceptions(root) {
  const file = join(root, 'docs', 'exceptions.md');
  if (!existsSync(file)) return null;
  const rows = [];
  for (const raw of readFileSync(file, 'utf8').replace(/\r\n/g, '\n').split('\n')) {
    const line = raw.trim();
    if (!line.startsWith('|')) continue;
    const cells = line
      .replace(/^\||\|$/g, '')
      .split('|')
      .map((cell) => cell.trim());
    if (cells.length < 3) continue;
    const rule = cells[0].replace(/^`|`$/g, '');
    const date = cells[2];
    if (!/^[A-Za-z0-9_./*-]+$/.test(rule) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    rows.push({ repo: '*', checks: new Set([rule]), reason: cells[1], date });
  }
  return rows;
}

// The organization rename moves every repository to the new owner without
// changing its name. An exception declares a repository, not an owner spelling,
// so it keeps applying under either organization owner while the rename is in
// flight. Personal forks and third parties are never matched.
const ORG_OWNERS = ['simpsonm09-org', 'simpsonm09-projects'];

function sameRepository(candidate, repo) {
  if (candidate === repo) return true;
  const slash = repo.indexOf('/');
  if (slash === -1) return false;
  if (!ORG_OWNERS.includes(repo.slice(0, slash))) return false;
  const name = repo.slice(slash + 1);
  return ORG_OWNERS.some((owner) => candidate === `${owner}/${name}`);
}

export function findException(exceptions, repo, id) {
  return exceptions.find(
    (entry) =>
      (entry.repo === '*' || sameRepository(entry.repo, repo)) && (entry.checks.has('*') || entry.checks.has(id)),
  );
}
