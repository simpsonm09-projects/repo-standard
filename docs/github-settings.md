# GitHub settings

The settings themselves are policy: see the
[repository settings table](https://github.com/simpsonm09-projects/.github/blob/main/standards/owner.md#plan-and-protection).
This guide covers the script that converges them and what the checker reads.

[`../scripts/apply-settings.mjs`](../scripts/apply-settings.mjs) prints a dry run by
default and writes only with `--apply`. It is idempotent, so it touches only a setting
that differs.

```bash
node scripts/apply-settings.mjs simpsonm09-projects/repo-standard
node scripts/apply-settings.mjs simpsonm09-projects/repo-standard --apply
```

It converges:

- `delete_branch_on_merge: true`
- `allow_merge_commit: false`, `allow_rebase_merge: false`, `allow_squash_merge: true`
- `allow_auto_merge: true`, unless `--allow-auto-merge off` is supplied
- secret scanning and push protection on a public repository
- Dependabot alerts and security updates

`--topic NAME` keeps an extra topic alongside the owner login. The owner login is always
a topic. `check-repo` reports `settings/topics` when it is absent, `settings/description`
when the description is empty and `settings/default-branch` when `main` is not the
default branch.

A repository cannot read its own secret-scanning state with its own token, so the script
applies it once and the checker does not audit it.

## Rulesets and the plan

[`../rulesets/`](../rulesets) holds `protect-main` and `protect-tags`. The apply scripts
upsert them by name. Rulesets on a private repository need GitHub Pro or GitHub Team; on
the Free plan the apply script reports what it would apply and stops. A public
repository can carry them, and `check-repo` reports a missing or ambiguous main ruleset.
See [governance.md](governance.md).

The standard covers the organization repositories only. A personal repository is out of
scope, so nothing here reads or configures it.
