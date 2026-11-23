# Scripts

The script rules are policy: see
[scripts](https://github.com/simpsonm09-projects/.github/blob/main/standards/owner.md#scripts).
This guide covers where a script lives and what the checker reads.

Repository scripts are TypeScript executed by Bun and called through `just`. A new
script is `.ts` from the start. Bash remains only as a thin launcher for a git hook or a
one-line wrapper. PowerShell is allowed only for code that runs on a Windows target.
Python stays only where TypeScript cannot do the job, recorded in `docs/exceptions.md`.

Existing `.mjs` checkers in this repository migrate to Bun TypeScript one script at a
time; `tsconfig.json` enables `strict`, `bun check` is the type check and `bun test` is
the test runner.

## Where a script lives

- `scripts/` holds repository operations. Each one is reachable from an operation
  manifest entry or a recipe.
- Git hooks run through Lefthook: `lefthook.yml` loads the shared `hooks-v2` configs and
  the `just` recipes implement the policy. `just hooks` installs them; there is no
  checked-in `.githooks` directory and no per-repository hook script.
- A single-platform script declares the platform in a header comment within the first
  ten lines:

  ```bash
  # platforms: windows
  ```

  The value is one word: `windows`, `posix`, `linux` or `macos`. A `.ps1` file must
  declare `windows`.

## Author rules

- Read paths from the script location, not the current directory.
- Print a dry run by default. Write only when the caller passes `--apply`.
- Exit non-zero on a real failure. Exit zero when there is nothing to do.
- Keep secrets out of a script. Read them from the environment by name.

## Conformance

`scripts/check-standard.mjs` runs a `scripting` group over a repository. Each rule is a
named entry in the printed matrix.

| Entry                       | Rule                                                                                                                                |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `scripting/windows-shell`   | the root `justfile` has a `set windows-shell` line                                                                                  |
| `scripting/shell-ops`       | a recipe body has no `&&`, `&`, `;`, `                                                                                              | `, redirection, `$VAR`, backtick substitution, `./`or`.\` |
| `scripting/interpreter`     | a recipe body names no interpreter as its command word outside a `{{ ... }}` expression or a `mise exec`/`mise run` line            |
| `scripting/script-declared` | every `scripts/**/*.ps1`, `scripts/**/*.sh` and `scripts/**/*.ts` is referenced by an operation or recipe, or declares its platform |
| `scripting/skill-recipe`    | a non-vendored skill says `just <recipe>`, never a script path                                                                      |
| `scripting/skill-location`  | a skill lives in `.agents/skills/`, not `.claude/skills/` or `.opencode/skills/`                                                    |
| `scripting/skill-link`      | every `.agents/skills/<name>` has the relative symlink `.claude/skills/<name>` → `../../.agents/skills/<name>`                      |
| `scripting/skill-set`       | the two skill sets differ, or a link is broken                                                                                      |
| `scripting/tools-check`     | a repository with a `tools.yaml` has a `tools-check` recipe                                                                         |

Run the group on one repository with `just check-standard .`. Run it over the whole fleet
with `just audit-fleet <repos-dir>`, which prints one matrix and exits non-zero when any
repository fails. Vendored PStack skills are exempt.

## Running

```bash
bash scripts/apply-rulesets.sh <owner>/<repo> --apply
```

The ruleset script needs an authenticated `gh` CLI. See [governance.md](governance.md).
