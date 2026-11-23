# Automation

Dependabot, auto-merge, CodeQL and the label rules are policy: see
[dependency automation](https://github.com/simpsonm09-projects/.github/blob/main/standards/owner.md#dependency-automation)
and [CodeQL](https://github.com/simpsonm09-projects/.github/blob/main/standards/owner.md#codeql).
This guide covers the optional workflows a repository copies from `templates/`. None of
them is enforced by `check-standard`.

## Dependency and Action updates

Dependabot is the only updater. Each repository carries
[`.github/dependabot.yml`](../templates/dependabot.yml), which schedules the weekly check
and groups minor and patch updates per ecosystem. Version updates start as soon as the
file is on the default branch. `scripts/apply-settings.mjs` turns on alerts and security
updates.

Dependabot updates an action SHA and its trailing version comment together. It does not
update a remote reusable-workflow reference, so
[`../templates/workflows/pin-update.yml`](../templates/workflows/pin-update.yml) checks
the caller pin on a schedule and opens a tracking issue when it falls behind `main`.

## Labels

[`../templates/workflows/labeler.yml`](../templates/workflows/labeler.yml) labels a pull
request by the paths it changes, using [`../templates/labeler.yml`](../templates/labeler.yml)
as the rule set. Copy the workflow to `.github/workflows/labeler.yml` and the rules to
`.github/labeler.yml`.

Every label named in the rule set must exist in the repository; the labeler skips a
missing one. Create the set once with `gh label create` or the web UI.

## Releases

[`../templates/workflows/release.yml`](../templates/workflows/release.yml) creates a
GitHub release when a `v*` tag is pushed. It uses `gh release create --generate-notes`,
so GitHub writes the notes from the merged pull requests and no third-party action runs.
Copy it to `.github/workflows/release.yml`, then push a tag.

Tag protection comes from the `protect-tags` ruleset. See [governance.md](governance.md).

## CodeQL

CodeQL default setup is a repository setting, not a workflow. Turn it on in the
repository's code security settings; there is no `codeql.yml` to copy or keep.

A language matrix that default setup cannot express is recorded in the repository's
`docs/exceptions.md` under `C6.1`, and only then does the repository keep a workflow.
CodeQL is never a required status check.
