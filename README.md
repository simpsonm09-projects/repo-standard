# repo-standard

The reusable repository standard for `simpsonm09-projects`. It owns the shared CI, linting, security scanning, and branch governance that every other repository consumes.

## What it provides

- Reusable GitHub Actions workflows for linting, AI-slop detection, and security scanning. Each repository calls them with a thin caller workflow.
- Bun as the JavaScript and TypeScript toolchain, with flint as the single activation point for the other languages.
- aislop as the AI-slop quality gate, reporting SARIF to the Security tab.
- Trivy for vulnerability scanning, diff-only on a pull request and full on `main` and the weekly schedule, plus a dedicated secret scanner.
- Dependabot for dependency and action updates, with alerts and security updates from the organization.
- Ruleset JSON and an idempotent apply script for branch and tag protection: squash-only `protect-main` with no bypass actors.
- A `justfile` task-runner convention, with `just` as the one local entry point.
- A fleet conformance checker that proves every repository matches the standard and stays aligned.
- Repository settings and owner-topic convergence through a dry-run apply script.
- TypeScript scripts executed by Bun through `just`, with bash kept as a thin launcher.
- A testing convention for the test job each repository adds to its caller workflow.
- A generated-OpenAPI contract rule for the repositories that expose an API, with a checker that fails a hand-edited document.
- Agent and skill templates for repository-local setup, with the plugin-versus-repository ownership rule. Repo-local skills live in `.agents/skills/`, with a relative `.claude/skills/<name>` symlink for Claude Code. Repo-local OpenCode agent profiles stay in `.opencode/agents/`. Shared skills reach both through plugins, not through this repository.
- A root README convention with a skeleton, a documentation layout, and an MIT license policy.
- Editor and git conventions, issue and pull request templates, and security policy.

## Consumption model

Every repository lives in the `simpsonm09-projects` organization. Work happens on a branch in that repository, with a pull request into `main`; the organization also requires signed commits and the required status checks. The normative policy is the [`simpsonm09-projects` owner standard](https://github.com/simpsonm09-projects/.github/blob/main/standards/owner.md); this repository holds the implementation. See [`docs/governance.md`](docs/governance.md) for the ruleset payloads and the apply scripts.

To adopt the standard in a repository, follow [`docs/adoption.md`](docs/adoption.md).

## Local use

The same checks run locally. Run `mise install` once, then `just --list`. See [`docs/local-runs.md`](docs/local-runs.md) and [`docs/task-runner.md`](docs/task-runner.md).

## Docs

Read [`docs/README.md`](docs/README.md) for the documentation index. The documentation layout is defined in [`docs/documentation.md`](docs/documentation.md). `just check-standard .` checks one repository and `just check-repo .` adds the checks a repository makes about itself. See [`docs/validation.md`](docs/validation.md).

## Pinning

Actions are pinned to commit SHAs and updated by Dependabot. See [`docs/pinning.md`](docs/pinning.md).

## Layout

- `.github/workflows/` holds the reusable workflows and this repository's own CI.
- `.github/config/` holds the Flint configuration.
- `rulesets/` holds the branch and tag rulesets as JSON.
- `scripts/` holds the Node checkers and apply scripts that migrate to Bun TypeScript one at a time.
- `justfile` holds this repository's task recipes.
- `templates/` holds files to copy into a consuming repository, including the `justfile`, the README and `AGENTS.md` skeletons, the license, agent profiles, and a skill skeleton.
- `docs/` holds the adoption, governance, documentation, local-run, pinning, task-runner, scripting, testing, validation, agent-and-skill, README, and license guides.

## License

MIT. See [`LICENSE`](LICENSE).

## Related repositories

- [`repo-template`](https://github.com/simpsonm09-projects/repo-template) is the generated-repo starting point.
- [`maxstack`](https://github.com/simpsonm09-projects/maxstack) composes the plugin layers for OpenCode and Claude Code. The org plugin registers its shared skills in OpenCode, Claude Code and GitHub Copilot CLI.
