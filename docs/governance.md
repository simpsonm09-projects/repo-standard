# Governance

The branch model, the protection rules and the required checks are policy. They live in
the [`simpsonm09-projects` owner standard](https://github.com/simpsonm09-projects/.github/blob/main/standards/owner.md#plan-and-protection).
This guide keeps only the implementation: the committed ruleset payloads, the apply
scripts and the gaps the checker prints.

## Committed rulesets

[`../rulesets/`](../rulesets) holds the payloads the apply scripts upsert by name.

| File | Target | Rule |
| --- | --- | --- |
| [`protect-main.json`](../rulesets/protect-main.json) | `refs/heads/main` | Pull request required, zero approvals, squash only, signed commits, the required checks, no bypass actors. |
| [`protect-tags.json`](../rulesets/protect-tags.json) | `refs/tags/v*` | Blocks update, deletion and force push. |

There is no `approval-main` payload. With zero required approvals and no bypass actors a
second review ruleset would exist only to carry a bypass.

`allowed_merge_methods` is `["squash"]` in `protect-main`. Merge commits and rebase
merges are also off in repository settings, because the ruleset only constrains merges
that go through a pull request.

## Apply

The apply scripts read the repository's agent level, build the payload for that level
and upsert every committed ruleset by name. They do not delete rulesets, and they stop
on a private repository until it becomes public.

```bash
bash scripts/apply-rulesets.sh <owner>/<repo>          # dry run
bash scripts/apply-rulesets.sh <owner>/<repo> --apply
```

```powershell
pwsh -File scripts/apply-rulesets.ps1 -Repo <owner>/<repo> -Apply
```

Print one payload without writing it:

```bash
node scripts/ruleset-payload.mjs rulesets/protect-main.json --level merge --repo <owner>/<repo>
```

`ruleset-payload.mjs` always empties the bypass list, sets zero approvals and forces
squash-only, whatever the level. It adds `coverage / coverage` for a covered repository
and removes it for an uncovered one.

## Repository settings

Rulesets do not cover every setting. [`apply-settings.mjs`](../scripts/apply-settings.mjs)
converges the rest; see [github-settings.md](github-settings.md).

## Checker gaps

`check-repo` audits the repository's own live state. A read-only token may not see
`bypass_actors`; the checker then reports the field as unverified rather than inferring
an empty list. Pass `--agent-level propose|merge|full` to fail closed on an omitted
field.

| Gap id | Meaning |
| --- | --- |
| `ruleset/protect-main` | `protect-main` is missing or duplicated. |
| `ruleset/ambiguous` | The ruleset id is not numeric. |
| `ruleset/approval-policy` | The explicit level is unsupported or does not match the policy. |
| `ruleset/rules`, `ruleset/required-checks` | The rules or the required checks are unreadable. |
| `ruleset/enforcement`, `ruleset/main-target` | The ruleset is inactive or cannot be verified to cover `main`. |
| `ruleset/protect-rule` | There is not exactly one `pull_request` rule. |
| `ruleset/protect-approval` | The approval count is not zero. |
| `ruleset/protect-signatures` | There is not exactly one `required_signatures` rule. |
| `ruleset/protect-bypass` | The bypass list is readable and not empty. |
| `ruleset/required-strict` | The ruleset does not require the branch to be up to date. |
| `ruleset/required-missing`, `ruleset/required-no-job`, `ruleset/required-unexpected` | The live required set differs from the expected set, or names a check no job reports. |
| `ruleset/merge-methods` | `protect-main` does not allow squash only. |

`check-agent-access` compares every roster repository's live `protect-main` with the
policy for its declared level.

## Required checks

The required set and the coverage states are policy. See the
[required checks table](https://github.com/simpsonm09-projects/.github/blob/main/standards/owner.md#required-checks).

`scripts/lib/required.mjs` is the single list the checkers read. `check-standard` and
`check-repo` use it, and so does `ruleset-payload.mjs`, so they cannot disagree.

The local `ci.yml` may carry an `all-checks` aggregate. It waits for every other parsed
job in that workflow and succeeds only when every dependency result is `success`;
failure, cancellation and skipping fail the aggregate. The aggregate must use the
supported plain-key shape: `if: always()`, `ubuntu-24.04`, a five-minute timeout,
`permissions: {}`, exactly one step with `env.NEEDS` set to `{{ toJSON(needs) }}` and
the pinned run command `echo "$NEEDS" | jq -e 'all(.[]; .result == "success")'`. It is a
bounded contract checker, not a general YAML parser, so an unrecognized shape is a gap.
`ALL_CHECKS_REQUIRED` in `scripts/lib/required.mjs` keeps the aggregate out of the
required set until every repository reports it.

`codeql.yml` is outside the aggregate's `needs` graph. CodeQL default setup is not a
required check; see [automation.md](automation.md#codeql).

## Code owners

The effective `CODEOWNERS` must assign the default `*` pattern to `@simpsonm09`; a
wildcard-only pattern made from `/` and `*` must include it too. The root `CODEOWNERS`
path is required, and `.github/CODEOWNERS` is validated as well because GitHub gives it
precedence. GitHub requests the code owner as an optional reviewer, because
`require_code_owner_review` is `false`. The review is not a gate.

## Signed commits

The `protect-main` ruleset enforces `required_signatures`. GitHub signs the squash
commit it creates, so the merge passes. Each commit on the branch must be signed;
configure an SSH signing key on each runtime.

## Plan limits

Rulesets on a private repository need GitHub Pro for a personal account or GitHub Team
for an organization. On the Free plan a private repository cannot carry them, so the
apply script reports what it would apply and stops. `check-repo` fails a public
repository that is missing `protect-main`, so the gap cannot be forgotten.
