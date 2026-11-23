# Local runs

Run the same checks that CI runs, before pushing. The local/CI parity rule is policy:
see [CI speed](https://github.com/simpsonm09-projects/.github/blob/main/standards/core.md#c5-ci-speed).
This page is the command reference.

## Tools

Install mise once, then let it install the pinned tools from `mise.toml`.

```bash
curl https://mise.run | sh
mise install
```

## Task runner

`just` is the one entry point. See [task-runner.md](task-runner.md).

```bash
just --list        # show the recipes
just fmt-check     # check formatting
just lint          # lint
just typecheck     # type check, where TypeScript exists
just test          # run the test suite
just check         # everything CI requires
just agent-files   # check the skill paths and links
just verify        # lint, test, aislop, security and secret scan
```

## Lint

Run the tool directly to choose the scope.

```bash
bun fmt --check            # formatting
mise exec -- oxlint .      # JavaScript and TypeScript
mise exec -- flint run     # non-JavaScript languages
```

## AI-slop gate

Pin the same version as the aislop workflow.

```bash
npx --yes aislop@0.16.1 scan
npx --yes aislop@0.16.1 ci
```

## Security

```bash
trivy fs --scanners vuln,secret,misconfig --severity HIGH,CRITICAL .
docker run --rm -v "$PWD:/repo" -w /repo ghcr.io/gitleaks/gitleaks:v8.30.1 detect --source=. --redact
```

A pull request scans only the diff; `main` and the weekly schedule run the full scans.
To mirror a pull request locally:

```bash
docker run --rm -v "$PWD:/repo" -w /repo ghcr.io/gitleaks/gitleaks:v8.30.1 detect --source=. --log-opts="origin/main..HEAD" --redact
```

## Workflows

Run the GitHub Actions workflows locally with act. A Docker daemon is required.

```bash
act pull_request
```

## Hooks

`just hooks` installs the shared Lefthook hooks (C7.8). `lefthook.yml` loads
`hooks/core.yml` and `hooks/owner.yml` from `simpsonm09-projects/.github` at the
`hooks-v3` tag; the jobs call the C7.10 recipes in `justfile`. A local
`core.hooksPath=.githooks` is migrated, any other value is refused, and the merged
`core-*`/`owner-*` jobs are asserted before success. `lefthook-local.yml` is
git-ignored. See [scripting.md](scripting.md).
