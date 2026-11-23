# Exceptions

One row per rule this repository cannot meet yet. The reason and the revisit date
are required. The `standard` job reads this file instead of the central
`repo-standard/docs/exceptions.json`.

| Rule | Reason | Revisit |
| --- | --- | --- |
| `C7.3` | The `.mjs` checkers still run on Node. `bun test` cannot run the `node:test` suites. `package.json` and `bun.lock` are committed and `bun fmt`, `bun check` and `oxlint` are in place, but the `install` recipe still installs the pinned tools because no recipe reads `node_modules` yet. The install step and the test runner move to Bun with the TypeScript port. | 2027-05-31 |
| `C7.4` | The existing `.mjs` checkers and tests migrate to Bun TypeScript one script at a time, as the owner standard requires. This change adds the Bun plumbing only and does not add a new `.mjs` script. | 2027-05-31 |
