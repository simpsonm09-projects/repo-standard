# Documentation layout

The required layout is policy: see
[community files, documentation and definition of done](https://github.com/simpsonm09-projects/.github/blob/main/standards/owner.md#community-files-documentation-and-definition-of-done).
This page covers the rules `scripts/check-standard.mjs` enforces in the `docs` group.
See [validation.md](validation.md) for the gap ids.

## README

Keep `README.md` at the repository root with exactly one level-1 heading. When the
repository has a `docs/` tree, link `docs/README.md` from the README so the reader can
reach the index. See [root-readme.md](root-readme.md).

## Docs index

Keep `docs/README.md` as the index when the repository has any markdown under `docs/`.
Every other markdown file under `docs/` must be reachable from it through links, so a
document cannot become unreachable. Do not name a document so it differs from another
only by case; Windows collapses the two into one file.

## Manifest

Keep `docs/manifest.json`. It declares which optional artifacts apply, so "when
appropriate" is a fact the checker reads instead of a guess. Absent keys mean the
artifact does not apply.

```json
{
  "readme": true,
  "features": ["docs/features/example.md"],
  "diagrams": ["docs/architecture.md"],
  "api": { "spec": "docs/openapi.json" }
}
```

- `readme` is a boolean and reserved for future use.
- `features` lists one document per user-facing feature under `docs/features/`.
- `diagrams` lists documents that carry a flow, sequence or architecture diagram.
- `api` is a spec path or an object with a string `spec`.

Unknown keys fail the check.

## Feature docs

Add a document under `docs/features/` for each feature a reader must understand to use or
maintain the repository. A feature doc states what the feature does, the shape of its
data and the failure modes. Link every feature doc from `docs/README.md`; the manifest
and the index must agree.

## Diagrams

Add a diagram when a document describes a flow, a sequence or a system boundary. Use a
fenced `mermaid` block. `plantuml`, `graphviz` and `dot` fences also pass. GitHub renders
Mermaid natively, so prefer it.

## API contracts

Declare an OpenAPI or AsyncAPI document in the manifest. The check confirms the file
exists and declares a version, and reports `docs/api-generated` when the document is not
marked `linguist-generated` or the `justfile` has no `spec` recipe.

Generate the document from the code rather than editing it by hand. Annotate the handlers
and schema types, add a `spec` recipe that regenerates it, and let the `test` job fail on
drift. Frameworks that emit the document: FastAPI for Python, Fastify with
`@fastify/swagger` for Node, and springdoc-openapi for Kotlin with Spring Boot.

## Optional directories

A repository may add `docs/decisions.tsv` (append-only decision trail), `docs/runbooks/`
and `docs/machines/`.

## Templates

Start from [`../templates/docs/`](../templates/docs/). It holds an index, a manifest, an
architecture page and a feature page skeleton.
