# Pinning

The pinning rules are policy: see
[pinning and tool versions](https://github.com/simpsonm09-projects/.github/blob/main/standards/owner.md#pinning-and-tool-versions).
This guide covers the mechanics that keep the pins current.

## Actions

Every `uses:` is a full 40-character commit SHA with a trailing `# vX.Y.Z` comment.

```yaml
uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
```

Resolve an annotated tag to its commit, never to the tag object:

```bash
gh api repos/actions/checkout/git/ref/tags/v7.0.1 --jq .object.sha
gh api repos/actions/checkout/git/tags/<tag-object-sha> --jq .object.sha
```

Dependabot updates the SHA and the comment together. `check-standard` reports
`ci/pin` for a repo-standard reference that is not a 40-character SHA.

## Reusable workflow callers

A consuming repository pins every reusable workflow to a reviewed commit of this
repository, never `@main`. Dependabot does not update a remote reusable-workflow
reference, so [`templates/workflows/pin-update.yml`](../templates/workflows/pin-update.yml)
opens a tracking issue when the pin falls behind.

When you copy [`templates/caller-ci.yml`](../templates/caller-ci.yml), replace its pin
with the full SHA of the standard revision you reviewed, and keep it fixed until you
review a later revision. See [automation.md](automation.md).

## Tools and images

Tool versions are pinned in `mise.toml`; every repository of one owner pins the same
versions. Flint runs only the tools declared there. Dependabot does not manage
`mise.toml`, so bump the pin by hand.

Container references are pinned to a version tag, or to a digest where the registry
supports it.
