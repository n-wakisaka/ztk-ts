# ztk-ts

`ztk-ts` is a TypeScript toolkit for parsing and serializing ZTK files.

The initial scope is:

- parse ZTK into a reusable AST
- preserve tag and key order
- preserve unknown tags and keys
- support multi-line values used by matrices and frames
- provide serialization helpers for round-trip and normalized output
- expose normalized semantic serialization diagnostics for lossy/upstream-aligned output decisions
- keep source-preserving save and runtime-oriented export as separate responsibilities

The module is intentionally independent from `three.js`.
Rendering and kinematics belong in `roki-three`.

## Docs

- `docs/ztk-spec-notes.md`: Phase 0 survey notes from related mi-lib repositories
- `docs/ztk-tag-matrix.md`: initial tag/key matrix for semantic modeling priorities
- `docs/ztk-upstream-audit-playbook.md`: repeatable audit guide for checking future upstream tag/key changes
- `docs/ztk-serializer-policy.md`: normalized semantic serializer policy by tag/key

## API notes

- `serializeZtk()` preserves the parsed AST as-is
- `serializeZtkNormalized()` normalizes raw AST formatting only
- `resolveZtk()` emits `validation` diagnostics for parse/resolve problems
- `serializeSemanticZtkPreservingSource()` emits the original source AST stored on the semantic document for lossless save flows
- `serializeSemanticZtkNormalized()` emits upstream-aligned normalized output from the semantic model and reports `serialization-policy` diagnostics for lossy normalization decisions such as alias folding, inactive key omission, jointtype-specific key pruning, shape-source pruning, or transform canonicalization to `frame`
- `analyzeSemanticZtkMaterializedRuntime()` is a preflight helper for future runtime/export materialization; it reports which shapes would be materialized and whether the current semantic model has enough information to do it, and it accepts an optional `resolveImportedShapeGeometry(shape)` callback for external `import` geometry
- `serializeSemanticZtkMaterializedRuntime()` currently supports mirror-based materialization for primitive shapes, NURBS, explicit polyhedra, and procedural polyhedra whose loop structure is preserved semantically; external `import` geometry can also be materialized when the caller supplies `resolveImportedShapeGeometry(shape)`
- procedural polyhedron loops now have structured semantic forms (`ZtkProceduralLoop`, `ZtkProceduralLoopCommand`) in addition to the legacy flat token list
- `serialization-policy` diagnostics now also expose `effect`:
  - `canonicalization`: semantics preserved but representation unified
  - `source-loss`: source-only or inactive detail omitted
  - `runtime-materialization`: reserved for future export paths that expand authoring structure for runtime use
- runtime-oriented materialization such as expanding `mirror` / `import` is intentionally a separate future export layer, not part of normalized save
