# Testing

The test jobs are policy: see
[testing](https://github.com/simpsonm09-projects/.github/blob/main/standards/owner.md#testing).
This guide covers the job shape each repository adds.

## Add a test job

Add a `test` job to the repository's caller workflow next to the shared jobs.
[`../templates/caller-ci.yml`](../templates/caller-ci.yml) holds the shared jobs and a
generic test job. Replace the test command with the repository's own:

```yaml
test:
  runs-on: ubuntu-24.04
  timeout-minutes: 15
  steps:
    - name: Checkout
      uses: actions/checkout@<sha> # <version>
      with:
        persist-credentials: false
    - name: Install pinned tools
      uses: jdx/mise-action@<sha> # <version>
    - name: Test
      run: just test
```

Pin every action to a commit SHA with the version in a trailing comment. See
[pinning.md](pinning.md).

`just test` is the only command CI runs. A pull request runs `just test-changed` where
the repository has a selector; `main` and the weekly schedule run the full suite.

### A second test job

A second suite is a job named `test-<suffix>` on an `ubuntu-*` runner, for example a
shard or a language matrix. It stays non-required until it has been green for a week. The
checker accepts a required `test-<suffix>` check only when `ci.yml` defines that job.
Every job runs on Linux (C5.6); a `test-windows` or `test-macos` job, or any
`windows-*`/`macos-*` runner, is a `ci/platform` gap.

## Regenerate the API document

A repository that exposes an HTTP API regenerates the OpenAPI document and fails on
drift. Run it before the coverage gate. See [documentation.md](documentation.md).

```yaml
- name: Check the API document
  run: |
    just spec
    git diff --exit-code -- docs/openapi.*
```

## Required check

Name the job `test` so the required check has one stable name across the fleet. The
required set and the coverage states are in the
[required checks table](https://github.com/simpsonm09-projects/.github/blob/main/standards/owner.md#required-checks).

## Local

Run the suite through the task runner:

```bash
just test
```
