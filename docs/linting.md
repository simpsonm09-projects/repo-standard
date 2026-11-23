# Linting

The toolchain split is policy: see
[JavaScript and TypeScript toolchain](https://github.com/simpsonm09-projects/.github/blob/main/standards/owner.md#javascript-and-typescript-toolchain)
and [toolchain and scripts](https://github.com/simpsonm09-projects/.github/blob/main/standards/core.md#c7-toolchain-and-scripts).
This guide covers what the recipes and `mise.toml` declare.

## JavaScript and TypeScript

Bun is the whole toolchain. Do not declare Biome, a standalone `tsc` step or Vitest in a
new repository.

| Job | Command | Recipe |
| --- | --- | --- |
| format | `bun fmt` / `bun fmt --check` | `fmt` / `fmt-check` |
| lint | `bun lint --no-script` (oxlint until `bun lint` is stable) | `lint` |
| types | `bun check` | `typecheck` |
| test | `bun test` | `test` |
| build | `bun build` | `build` |

`package.json` has no `fmt` or `lint` script. Pin `bun` and `oxlint` in `mise.toml`.
Remove `biome.jsonc` when it served only JavaScript.

## Flint for everything else

Flint stays as the single activation point for the non-JavaScript languages. It reads
`.github/config/flint.toml` through `FLINT_CONFIG_DIR`. An undeclared tool is skipped, so
a check never runs without a pinned tool.

Declare the workflow linters in every repository:

- `aqua:rhysd/actionlint` and `aqua:zizmorcore/zizmor`.

Declare the language tools the repository ships.

| Language or file | Linter | Formatter |
| --- | --- | --- |
| Python | `ruff` | `ruff-format` |
| Kotlin | `ktlint` | `ktlint` |
| Java | `checkstyle` | `google-java-format` |
| Go | `golangci-lint` | `gofmt` |
| Rust | `cargo-clippy` | `cargo-fmt` |
| C# | none | `dotnet-format` |
| Shell | `shellcheck` | `shfmt` |
| Markdown | `rumdl` | `rumdl` |
| YAML | `ryl` | `ryl` |
| TOML | none | `taplo` |
| Dockerfile | `hadolint` | none |
| Any | `editorconfig-checker`, `typos`, `lychee` | none |

Flint activates the Go, Rust and C# checks through each language's toolchain: declare
`go` (which provides `gofmt`) and `golangci-lint`; `rust` with the `clippy` and `rustfmt`
components; and `dotnet`, which provides `dotnet-format`. `cargo-fmt` and `dotnet-format`
are not `mise.toml` keys, so declaring either activates nothing. `golangci-lint` reads
`.golangci.yml` from `$FLINT_CONFIG_DIR`; `cargo-fmt` reads `rustfmt.toml` from the same
directory.

Flint ships one C# check, `dotnet-format`, classified as the formatter. A C# repository
that also wants analyzer linting adds its own `just` recipe.

## Complexity and size

Each language linter reads the limit from the config file it already owns.

| Metric | Default |
| --- | --- |
| Cognitive complexity | 15 |
| Cyclomatic complexity | 10 |
| Function length (statements) | 60 |
| Block nesting depth | 4 |
| Parameters | 6 |

| Language | Config file | Setting |
| --- | --- | --- |
| TypeScript, JavaScript | `bunfig.toml` / oxlint config | complexity rules |
| Python | `.github/config/ruff.toml` | `[lint]` C901, PLR0912, PLR0915, PLR0913, and `[lint.mccabe] max-complexity` |
| Go | `.github/config/.golangci.yml` | `gocyclo`, `gocognit`, `funlen`, `nestif` |
| Rust | `Cargo.toml` | `[lints.clippy]` `cognitive_complexity` and `too_many_lines` |
| C# and .NET | `.globalconfig` | `CA1502`, `CA1505`, `CA1506`, plus a repository-owned recipe |
| Kotlin | Detekt | `CyclomaticComplexMethod`, `LongMethod`, `NestedBlockDepth` |
| Java | checkstyle | `CyclomaticComplexity`, `NPathComplexity`, `JavaNCSS`, `MethodLength` |

The shared `.editorconfig` is byte-identical across the fleet, so repository-local
analyzer rules go in `.globalconfig` instead. When existing code trips a rule, set the
initial threshold at the current maximum, record why, and lower it as the code improves.

[`../templates/config/`](../templates/config/) holds a minimal snippet for each linter.

## Add a check

```bash
mise exec -- flint init --only ruff
```

This pins the tool in `mise.toml` and writes any managed config. Commit the pins it adds.

## Run it

```bash
just fmt-check   # JavaScript and TypeScript
just lint        # flint run, non-JavaScript
```

The shared `lint` job runs `just lint` in CI.

## Configuration

- Flint reads `.github/config/flint.toml` through `FLINT_CONFIG_DIR`.
- The canonical config for a linter lives under `.github/config`, unless the linter needs
  its own root file.
- Mark generated files `linguist-generated` in `.gitattributes` instead of excluding them.

See the [Flint CLI reference](https://github.com/grafana/flint/blob/main/docs/cli.md).
