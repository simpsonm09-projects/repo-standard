# Coverage

The gate is policy: see the
[CI speed plan](https://github.com/simpsonm09-projects/.github/blob/main/standards/owner.md#ci-speed-c5).
This guide covers the shared workflow, the recipe contract and the checker.

The `coverage` check gates the units a change adds or edits, not the whole repository.
A repository owns its suite and its coverage tool. It defines one `just coverage` recipe
that runs the suite and leaves an lcov report at `coverage/lcov.info`. The shared
[`coverage` workflow](../.github/workflows/coverage.yml) calls that recipe and then runs
[`scripts/patch-coverage.mjs`](../scripts/patch-coverage.mjs) over the report and the git
diff.

## The `just coverage` contract

`just coverage` is self-contained: the shared workflow installs only the pinned tools
with `jdx/mise-action`, so the recipe installs the repository's own dependencies, runs the
suite with coverage and writes `coverage/lcov.info`. The workflow checks the standard out
into `.standard/`; a runner that globs the repository must exclude it.

A repository that calls the shared workflow must define the recipe. The standard check
enforces it with `ci/coverage-recipe`. A repository without a coverage job records the
reason in its own `docs/exceptions.md` under `ci/coverage`.

```just
# Run the suite with coverage.
coverage:
    npx vitest run --coverage --coverage.reporter=lcov
```

A Python repository adds `pytest-cov`:

```just
coverage:
    pytest --cov=src --cov-report=lcov:coverage/lcov.info
```

## The gate

The gate reads the lcov report and the merge-base diff and measures only the lines the
change adds or edits. A change with no measured units passes, so a documentation-only
change is never blocked.

- `--mode lines|branches|both` picks what the gate measures. The default is `lines`.
- `--threshold` is the changed-line floor, 80 percent by default.
- `--branch-threshold` is the changed-branch floor, 70 percent by default.
- `--crap` prints an advisory CRAP score per changed function. It never fails the gate.
- `--allow-missing-branch` degrades to line coverage when the report carries no branch
  data.

The workflow calls the gate as:

```yaml
      - name: Patch coverage gate
        env:
          BASE: ${{ github.event.pull_request.base.sha || github.event.before }}
        run: node .standard/scripts/patch-coverage.mjs --lcov coverage/lcov.info --base "$BASE" --mode both --allow-missing-branch
```

In this repository the workflow runs `scripts/patch-coverage.mjs` with no `.standard/`
prefix. The workflow passes no thresholds, so the defaults apply everywhere.

## Branch data

Branch coverage needs `BRDA` records, and not every tool writes them.

- The Node built-in coverage reporter and Vitest's v8 provider write branch data.
- `pytest-cov` writes branch data only with `--cov-branch`.
- `cargo-llvm-cov` writes branch data only with `--branch`.
- The JaCoCo and Cobertura converters emit `BRDA`.
- Go writes no branch data, so the shared workflow degrades a Go repository to line
  coverage and prints that it did.

The gate is fail-closed. When the mode requires branches and the report has no `BRDA`
records, it fails; pass `--allow-missing-branch` to degrade instead. CRAP also needs `FN`
records.

## Converters

A Kotlin repository runs Kover or JaCoCo and adds a converter that writes
`coverage/lcov.info`; [`repo-template`](https://github.com/simpsonm09-projects/repo-template/blob/main/scripts/jacoco-to-lcov.mjs)
is the worked example. A Go repository writes a coverprofile and converts it:

```bash
go test ./... -coverprofile=coverage/cover.out
node scripts/coverprofile-to-lcov.mjs
```

A .NET repository runs coverlet and converts the cobertura report:

```bash
dotnet test --collect:"XPlat Code Coverage"
node scripts/cobertura-to-lcov.mjs
```

## Run it locally

```bash
node scripts/patch-coverage.mjs --lcov coverage/lcov.info --base origin/main
```

Add `--mode both --allow-missing-branch` to mirror the workflow. The 80 and 70 thresholds
are the defaults.
