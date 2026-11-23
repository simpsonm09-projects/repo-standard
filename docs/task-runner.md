# Task runner

`just` is the single entry point for humans, agents and CI. See
[toolchain and scripts](https://github.com/simpsonm09-projects/.github/blob/main/standards/core.md#c7-toolchain-and-scripts)
and the [owner script rules](https://github.com/simpsonm09-projects/.github/blob/main/standards/owner.md#scripts).
This guide covers the recipe set and how a recipe stays thin.

Repositories carry a `justfile` at the root. Run `just --list` to see the recipes.

## Recipes

The core set every repository provides:

| Recipe | Does |
| --- | --- |
| `just` | Lists the recipes. |
| `just install` | Installs the pinned tools with `mise install`. |
| `just fmt` | Formats with `bun fmt`. |
| `just fmt-check` | Checks formatting with `bun fmt --check`. |
| `just lint` | Runs `bun lint` (oxlint) and flint for non-JavaScript files. |
| `just typecheck` | Runs `bun check` where the repository has TypeScript. |
| `just test` | Runs the suite. |
| `just check` | Runs everything CI requires, in parallel where possible. |
| `just hooks` | Installs the git hooks. |
| `just agent-files` | Checks `.agents/skills/` against `.claude/skills/`. |

Repositories add `coverage`, `test-changed`, `test-portable`, `spec`, `complexity`,
`build`, `prune` and language recipes as they need them. Keep the names conventional so
a reader can guess them. Arguments are positional, as in `just emit config.json out.json`.

## Author rules

- Prefer a portable recipe. Split into per-platform scripts only when the logic needs the
  platform.
- Call a portable executable. Do not put shell operators (`&&`, `&`, `;`, `|`),
  redirection, `$VAR`, backtick substitution, `./` or `.\` in a recipe.
- Put multi-step logic in a TypeScript script under `scripts/` and call it from the
  recipe. Bash is a thin launcher for a hook or a one-line wrapper. PowerShell is for
  Windows-target code only.
- Keep the `set windows-shell` line at the top so a recipe behaves the same on Windows.

Start from [`../templates/justfile`](../templates/justfile).

## Platform scripts

A script that runs on one platform declares it in a header comment within the first ten
lines. The value is `windows`, `posix`, `linux` or `macos`. A `.ps1` file declares
`windows`; a `.sh` file declares `posix` when it is portable, or the more specific
`linux` or `macos` when it is not.

```bash
# platforms: posix
```

Call the recipe the same way on every platform; do not name the interpreter or the script
file in the call.

## Conformance

`scripts/check-standard.mjs` runs the `scripting` group over a repository. See
[scripting.md](scripting.md) for the gap ids.

Run the check on one repository with `just check-standard .`. Run it over the fleet with
`just audit-fleet <repos-dir>`, which prints one matrix and exits non-zero when any
repository fails.

## Pinning

`just` is pinned in `mise.toml`. Run `mise install` to get it. Dependabot does not manage
`mise.toml`, so bump the pin by hand.

## When there is no justfile

Fall back to the commands in the repository README or `mise.toml`. Prefer `just` when it
exists.
