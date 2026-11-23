# Exceptions

One row per rule this repository cannot meet yet. The reason and the revisit date
are required. The `standard` job reads this file instead of the central
`repo-standard/docs/exceptions.json`.

| Rule | Reason | Revisit |
| --- | --- | --- |
| `C7.3` | The `.mjs` checkers still run on Node. `bun test` cannot run the `node:test` suites, and the repository has no dependencies to install from a lockfile. The Bun formatter, oxlint and `bun check` are in place; the test runner and the install step migrate with the TypeScript port. | 2027-05-31 |
| `C7.4` | The existing `.mjs` checkers and tests migrate to Bun TypeScript one script at a time, as the owner standard requires. This change adds the Bun plumbing only and does not add a new `.mjs` script. | 2027-05-31 |
