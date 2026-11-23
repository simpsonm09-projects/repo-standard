# Adopting the standard

The rules are policy: see the
[owner standard](https://github.com/simpsonm09-projects/.github/blob/main/standards/owner.md).
This page is the implementation checklist. Do these steps once per repository.

## 1. Add the caller workflow

Copy [`templates/caller-ci.yml`](../templates/caller-ci.yml) to
`.github/workflows/ci.yml`. It calls the reusable lint, aislop, security, standard and
coverage workflows, and defines the repository's own `test` job.

Replace the template's pin with the full SHA of the reviewed standard revision, and keep
it fixed until you review a later revision. [`pin-update.yml`](../templates/workflows/pin-update.yml)
reports when a newer revision exists.

The `standard` job runs [`check-repo.mjs`](../scripts/check-repo.mjs) for the repository.
See [`features/fleet-conformance.md`](features/fleet-conformance.md).

## 2. Add the tool pins

Copy [`templates/mise.toml`](../templates/mise.toml) to the repository root.

- JavaScript and TypeScript repositories keep the Bun block: `bun fmt`, `bun lint`
  (oxlint until `bun lint` is stable), `bun check` and `bun test`.
- Other languages replace the language block with their own toolchain and keep flint as
  the single activation point for their linters.
- Replace the placeholder test and coverage tasks with the repository's own commands,
  and make sure `just coverage` writes `coverage/lcov.info`.

See [linting.md](linting.md) and [coverage.md](coverage.md).

## 3. Add the task runner

Copy [`templates/justfile`](../templates/justfile) to the repository root. It provides
the recipe set `install`, `fmt`, `fmt-check`, `lint`, `typecheck`, `test`, `check`,
`hooks` and `agent-files`, plus the repository's own recipes. Copy
[`scripts/prune.mjs`](../scripts/prune.mjs) to the repository root so `just prune`
works. See [task-runner.md](task-runner.md).

## 4. Add the README and license

Copy [`templates/README.md`](../templates/README.md) and
[`templates/LICENSE`](../templates/LICENSE) to the repository root and replace the
placeholders. See [root-readme.md](root-readme.md) and [license.md](license.md).

## 5. Add the scan configuration

- Copy [`trivy.yaml`](../trivy.yaml) to the repository root.
- Copy [`templates/aislop-config.yml`](../templates/aislop-config.yml) to
  `.aislop/config.yml`.
- Copy [`.github/config/flint.toml`](../.github/config/flint.toml) so flint has a
  configuration file. It lists only the non-JavaScript tools; Bun owns JavaScript and
  TypeScript.

## 6. Adopt Dependabot

Copy [`templates/dependabot.yml`](../templates/dependabot.yml) to
`.github/dependabot.yml` and keep the ecosystems the repository ships. Dependabot has no
shareable preset, so the file lives in each repository. See [automation.md](automation.md).

## 7. Add the editor and git conventions

Copy `.editorconfig`, `.gitattributes` and the `.gitignore` entries of interest. Mark
generated files in `.gitattributes` with `linguist-generated`.

Never commit or push actual `.env` files, even when they hold no secrets or were later
deleted from the branch. The pre-push guard checks filenames in reachable history, and
the `env` group also checks the index. Commit a sibling `*.example` template, ignore the
local file and list it in `.worktreeinclude`. Start from
[`templates/.env.example`](../templates/.env.example) and
[`templates/.worktreeinclude`](../templates/.worktreeinclude).

Copy [`templates/lefthook.yml`](../templates/lefthook.yml) and the hook scripts under
[`templates/scripts/`](../templates/scripts/) that the repository needs, then add the C7.10
recipes from [`templates/justfile`](../templates/justfile). `just hooks` installs the shared
`hooks-v2` configs; there is no checked-in `.githooks` directory. Add the `hooks` job from
[`templates/caller-ci.yml`](../templates/caller-ci.yml) to `ci.yml` and ignore
`lefthook-local.yml`.

## 8. Add the documentation layout

Copy [`templates/docs/`](../templates/docs/) into `docs/`, then replace the skeleton with
the repository's own index, manifest, architecture page and feature pages. See
[documentation.md](documentation.md).

## 9. Add agent and skill files

Copy [`templates/AGENTS.md`](../templates/AGENTS.md) when the repository has repo-specific
facts. Do not add a `CLAUDE.md`.

Copy [`templates/skills/example-skill/`](../templates/skills/example-skill/) to
`.agents/skills/<id>/`, renamed to the skill id. Then add the relative symlink Claude Code
needs:

```bash
ln -s ../../.agents/skills/<id> .claude/skills/<id>
```

`.agents/skills/` is canonical and `.claude/skills/` holds only symlinks. `just agent-files`
fails when the two sets differ, a link is broken or a skill names a recipe that does not
exist. Copy [`templates/agents/`](../templates/agents/) into `.opencode/agents/` only when
the repository needs a repo-specific OpenCode agent profile. See
[agents-and-skills.md](agents-and-skills.md).

## 10. Add community files

Copy `SECURITY.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `CODEOWNERS`, `LICENSE` and
the templates from `.github/ISSUE_TEMPLATE/` and `.github/pull_request_template.md`. See
[community.md](community.md).

`LICENSE`, `SECURITY.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SUPPORT.md`,
`.editorconfig`, `.aislop/config.yml`, the pull request template and the three issue
templates are byte-identical across the fleet. `CODEOWNERS` and `.gitattributes` are per
repository.

## 11. Apply branch protection and repository settings

Apply the rulesets and converge the settings. See [governance.md](governance.md) and
[github-settings.md](github-settings.md).

```bash
bash scripts/apply-rulesets.sh <owner>/<repo> --apply
node scripts/apply-settings.mjs <owner>/<repo> --apply
```

## 12. Verify

Open a pull request and confirm every required job reports. Then run the checker from the
repository root:

```bash
node scripts/check-standard.mjs .
node scripts/check-repo.mjs . --repo <owner>/<repo>
```

A rule the repository cannot meet is recorded in its own `docs/exceptions.md` with the
rule id, the reason and a revisit date. An exception without a reason or a date is drift.

## Optional automation

- Labels: [`../templates/workflows/labeler.yml`](../templates/workflows/labeler.yml) and
  [`../templates/labeler.yml`](../templates/labeler.yml). Create the labels first.
- Releases: [`../templates/workflows/release.yml`](../templates/workflows/release.yml).
- CodeQL: default setup, not a workflow. See [automation.md](automation.md#codeql).
