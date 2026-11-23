# <repo-name> working agreements

<One line: what this repository is.>

## Ground rules

- <An invariant an agent must not break.>
- No secret, credential, or machine path is committed.

## Git hooks

Hooks run through Lefthook (C7.8). `lefthook.yml` loads `hooks/core.yml` and `hooks/owner.yml` from
`simpsonm09-projects/.github` at the `hooks-v3` tag; the jobs call the C7.10 recipes in `justfile`.
`just hooks` installs them and asserts the merged jobs; `lefthook-local.yml` is git-ignored.

Never skip a hook (C7.11): no `LEFTHOOK=0`, no `--no-verify`, and never create `lefthook-local.yml`.

## Commands

- `just install`, `just fmt-check`, `just lint`, `just typecheck`, `just test`, `just verify`, `just agent-files`.

## Repo facts

- Language and toolchain: <...>.
- Data: <database structure, schema location, migration command>.
- Domain: <rules an agent must know>.

## Skills

- Load `<repo-skill-id>` for <task>.
