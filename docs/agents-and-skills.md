# Agents and skills

The skill paths and the `AGENTS.md` rule are policy: see
[agent instructions and skills](https://github.com/simpsonm09-projects/.github/blob/main/standards/core.md#c8-agent-instructions-and-skills)
and [skills](https://github.com/simpsonm09-projects/.github/blob/main/standards/owner.md#skills).
This page covers where a repository puts its files and what the checker reads.

## Ownership

General best practices and integration live in the plugins. Repository-specific facts
live in the repository.

| Layer | Owns | Examples |
| --- | --- | --- |
| Plugins | General best practices and integration | `service-integrations`, `local-services`, `repo-tasks`, `dev-tools`, `discord`, `integrations-personal`, the PStack workflow skills |
| Repository | Only repo-specific facts | language and toolchain, database structure, domain rules, architecture invariants, repo commands |

The test: would this help another repository? If so, it belongs in a plugin. A repository
never restates a plugin skill; it names the skill to load.

## Locations

| Path | Purpose |
| --- | --- |
| `AGENTS.md` | The routing instruction: what the repository is, the commands, the invariants and which skills to load. No standalone `CLAUDE.md`. |
| `.agents/skills/<id>/SKILL.md` | The canonical repo-specific skill. Codex, OpenCode, Pi, Cursor, Copilot CLI, Antigravity and Gemini CLI read this path. |
| `.claude/skills/<id>` | A relative symlink to `../../.agents/skills/<id>`. Claude Code reads only this path. |
| `.opencode/agents/<id>.md` | A repo-specific OpenCode subagent profile. |

A repository adds `AGENTS.md` when it has repo-specific facts. It adds
`.agents/skills/<id>/` for each repo-specific skill, plus the `.claude/skills/<id>`
symlink, and `.opencode/agents/` only when it needs a repo-specific agent profile.

## Repo-local skills

Create the canonical directory and the link:

```bash
mkdir -p .agents/skills/verify
ln -s ../../.agents/skills/verify .claude/skills/verify
```

`.claude/skills/` holds no real directory. `just agent-files` fails when the two sets
differ, a link is broken, or a skill names a recipe that does not exist. Windows clones
set `core.symlinks=true`; a checkout where links became text files fails the same recipe.

`.opencode/skills/` is the old location and is not used. The checker reports
`scripting/skill-location` for a skill there.

## Skill rules

- A repo skill id must not collide with a plugin skill id. OpenCode skill names are
  unprefixed, so the clash is real there. Claude Code names plugin skills with the plugin
  prefix.
- `name` equals the directory id.
- `description` is third-person and names the trigger.
- A skill calls `just <recipe>`, never a script path.
- Keep secrets, machine paths, credentials and personal data out. Put machine-specific
  AI files on the `local` branch.

## Harnesses

| Harness | Repo-local skills | Repo-local agents |
| --- | --- | --- |
| OpenCode | `.agents/skills/` and `.claude/skills/` | `.opencode/agents/` |
| Claude Code | `.claude/skills/` only, so the symlink is required | not read |
| Codex, Pi, Cursor, Copilot CLI, Antigravity, Gemini CLI | `.agents/skills/` | not documented here |

The org plugin's access gate supports OpenCode, Claude Code, GitHub Copilot CLI and Pi.
See [`features/agent-access.md`](features/agent-access.md) and the org plugin README for
installation.

## Repo facts

Put these in `AGENTS.md`, not in a plugin.

- Language and toolchain.
- Data: database structure, schema location, migration command.
- Domain: rules an agent must know.
- Repo-specific commands and their quirks.

`maxstack/AGENTS.md` and `browser-calculator/AGENTS.md` are worked examples.

## Templates

Copy [`../templates/AGENTS.md`](../templates/AGENTS.md),
[`../templates/agents/repo-worker.md`](../templates/agents/repo-worker.md),
[`../templates/agents/repo-reviewer.md`](../templates/agents/repo-reviewer.md) or
[`../templates/skills/example-skill/`](../templates/skills/example-skill/) into the
repository. Copy the skill template to `.agents/skills/<id>/` and rename the directory to
the skill id, then add the symlink.

The two agent templates use OpenCode's frontmatter (`mode`, `permissions`) and call the
`skill` tool, so they are OpenCode only. The skill template uses `name` and `description`
frontmatter, the same format the plugin layers use, so it works in both harnesses.
