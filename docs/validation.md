# Validation

Each repository checks itself against the standard in its own CI. There is no
organization-wide token, and no repository audits another through the API.

The exception mechanism is policy: see
[exceptions](https://github.com/simpsonm09-projects/.github/blob/main/standards/owner.md#exceptions).
This page covers the two checkers and the gap ids.

The standard also ships a local fleet audit. `scripts/audit-fleet.mjs` reads the sibling
checkouts on disk and prints one matrix. It runs from a checkout of this repository,
needs no token and never runs in a consuming repository's CI.

## Run the checks

```bash
just check-standard .        # the pure tree-local check
just check-repo .            # the check a repository runs in its own CI
```

`check-standard` reads only the working tree and the pinned standard. It never reads the
exception file, so it is honest on its own.

`check-repo` runs `check-standard` and then adds the checks a repository can make about
itself through the GitHub API with its own token. Pass `--no-api` to skip the API checks.
Pass `--agent-level propose|merge|full` to compare the live ruleset with the level policy.

## Groups

| Group | Checks |
| --- | --- |
| `files` | The required paths exist. |
| `mise` | `mise.toml` pins `aqua:casey/just`. |
| `ci` | `ci.yml` calls `lint`, `aislop`, `security` and `standard` at a pinned SHA, and defines a `test` job that runs on a runner. It also defines a `coverage` job that calls the shared coverage workflow at a pinned SHA, unless the repository records `ci/coverage` in its exception file. |
| `dependabot` | `.github/dependabot.yml` declares version 2, a scheduled ecosystem and no inline credential. |
| `community` | The byte-identical community files match the pinned standard. |
| `docs` | The [documentation layout](documentation.md) holds. |
| `scripting` | Recipe bodies stay portable, scripts are declared, non-vendored skills call `just <recipe>`, and the skill tree and its symlinks agree. |
| `env` | Git's index contains no actual `.env` file at any depth, and the pre-push hook rejects such filenames in every proposed ref's reachable history. |
| `subprocess` | Every `node:child_process` call passes a literal `windowsHide: true`. |
| `settings` | The default branch is `main`, the description is set and the owner topic is present. |
| `ruleset` | Successful API responses for a public repository are checked for exactly one active `protect-main` targeting `main`; its required checks match the repository's coverage state, with a job for each. |

API read failures are notices and do not establish protection. A `standard: ok` result
does not prove complete API coverage when a read failed.

## What a repository cannot check about itself

Secret scanning, push protection and the merge methods are not readable with a
repository token. `apply-settings` sets them once and the checker does not audit them.
See [github-settings.md](github-settings.md).

A repository also cannot see another repository through the API, so nothing checks a
sibling repository in CI. The local fleet audit reads sibling checkouts on disk instead.

## Exceptions

A repository records a tolerated gap in its own `docs/exceptions.md`: one row per rule
with the rule id, the reason and a revisit date. An exception without a reason or a date
is drift.

```markdown
| Rule | Reason | Revisit |
| --- | --- | --- |
| `ci/coverage` | Records. The roster and policy are data; `scripts/validate.mjs` is the test. | 2027-03-01 |
```

- The rule id matches the id the checker prints, or `*` for every rule.
- The reason says why the gap is tolerated.
- The revisit date is `YYYY-MM-DD`.

`check-repo` reads the repository-local file first. The central
[`exceptions.json`](exceptions.json) remains for repositories that predate the local
file; a repository with a local file does not need a change to the standard.

An exception on `ci/coverage` declares that a repository has no coverage job. Its reason
says why: the repository has no executable code under test (**Records**), or its code
under test cannot be measured by the shared coverage workflow (**Not measurable**).

## The caller workflow

A repository runs the check through the reusable `standard.yml`, pinned to a commit of
this repository. The workflow checks out the caller and this repository at the pin, then
runs `check-repo` with the caller's own token. See [adoption.md](adoption.md) and
[features/fleet-conformance.md](features/fleet-conformance.md).
