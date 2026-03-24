# ztk-ts

`ztk-ts` is a TypeScript toolkit for parsing and serializing ZTK files.

The initial scope is:

- parse ZTK into a reusable AST
- preserve tag and key order
- preserve unknown tags and keys
- support multi-line values used by matrices and frames
- provide serialization helpers for round-trip and normalized output

The module is intentionally independent from `three.js`.
Rendering and kinematics belong in `roki-three`.

## Docs

- `docs/ztk-spec-notes.md`: Phase 0 survey notes from related mi-lib repositories
- `docs/ztk-tag-matrix.md`: initial tag/key matrix for semantic modeling priorities
