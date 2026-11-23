# Community health files

The required set is policy: see
[community files, documentation and definition of done](https://github.com/simpsonm09-projects/.github/blob/main/standards/owner.md#community-files-documentation-and-definition-of-done).
This page records the exact paths and the byte-identical set that
`scripts/check-standard.mjs` enforces in the `community` and `files` groups.

GitHub detects community files in the repository root, in `.github/` or in `docs/`. The
standard keeps them in the root so the same path works in every checkout and in the
byte-identical comparison.

## Required files

`README.md`, `CODE_OF_CONDUCT.md`, `CONTRIBUTING.md`, `SECURITY.md`, `LICENSE` and
`SUPPORT.md`. All except `README.md` are byte-identical across the fleet. Copy them from
this repository without edits. See [adoption.md](adoption.md) and
[root-readme.md](root-readme.md).

## Byte-identical set

These files must match this repository byte for byte.

- `LICENSE`
- `SECURITY.md`
- `CONTRIBUTING.md`
- `CODE_OF_CONDUCT.md`
- `SUPPORT.md`
- `.editorconfig`
- `.aislop/config.yml`
- `.github/pull_request_template.md`
- `.github/ISSUE_TEMPLATE/bug.yml`
- `.github/ISSUE_TEMPLATE/feature.yml`
- `.github/ISSUE_TEMPLATE/config.yml`

`CODEOWNERS` and `.gitattributes` are per repository. Set the owner in `CODEOWNERS` and
add `linguist-generated` lines to `.gitattributes` for generated files.

## Description

Keep a one-line description that names what the repository is and who uses it.
`check-repo` reports `settings/description` when it is empty. Set it with
`gh repo edit --description`.

The community profile score is a guide, not a gate; the required files and the
description are the parts the standard controls.
