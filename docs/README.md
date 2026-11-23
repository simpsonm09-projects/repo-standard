# Documentation

This directory holds the implementation of the standard. Policy lives in the
[`simpsonm09-projects` owner standard](https://github.com/simpsonm09-projects/.github/blob/main/standards/owner.md);
this repository holds the reusable workflows, the checkers and the apply scripts, and its
guides link there instead of restating the rules.

Start here, then read the guide that matches the task.

## Guides

- [Adopting the standard](adoption.md) walks a repository through the standard, one step at a time.
- [Automation](automation.md) covers Dependabot updates, the labeler, the release workflow and CodeQL.
- [Documentation layout](documentation.md) defines the layout the checker reads.
- [Local runs](local-runs.md) shows how to run the same checks as CI before pushing.
- [Task runner](task-runner.md) explains the `justfile` convention and the recipe set.
- [Validation](validation.md) documents the fleet conformance checker and the [exception file](exceptions.md).
- [Testing](testing.md) covers the test job each repository adds.

## Reference

- [Governance](governance.md) holds the ruleset payloads, the apply scripts and the checker gaps.
- [GitHub settings](github-settings.md) covers the settings script and what the checker reads.
- [Pinning](pinning.md) covers SHA resolution and the pin-update workflow.
- [Linting](linting.md) covers the Bun toolchain and the flint configuration for other languages.
- [Coverage](coverage.md) defines the changed-line coverage gate.
- [Scripts](scripting.md) covers script locations and the scripting checker.
- [Architecture](architecture.md) diagrams the fleet conformance check.

## Concepts

- [Agents and skills](agents-and-skills.md) covers `AGENTS.md`, the `.agents/skills/` tree and the `.claude/skills/` symlinks.
- [Fleet conformance](features/fleet-conformance.md) describes the two checkers end to end.
- [Agent access](features/agent-access.md) resolves a repository's agent level, guards pushes and gates agent shell commands.
- [Repository-maintenance planner](features/repository-maintenance-planner.md) is a pure, planning-only decision unit for cleanup eligibility.
- [Ownership policy planner](features/maintenance-ownership-policy.md) is a pure, candidate-only decision unit for local, fork-sync and cleanup ownership.
- [Delivery preflight receipt](features/delivery-preflight-receipt.md) records explicit, read-only delivery evidence without executing commands or deciding authorization.

## Conventions

- [Definition of done](definition-of-done.md) links the nine items and the pull request proof.
- [Root README](root-readme.md) defines the README every repository carries.
- [Community health files](community.md) defines the files GitHub detects and which are required.
- [License](license.md) defines the MIT license and the README section.
- [Contributing](../CONTRIBUTING.md) covers branches, pull requests and commits.
- [Security policy](../SECURITY.md) covers vulnerability reporting and scanning.
