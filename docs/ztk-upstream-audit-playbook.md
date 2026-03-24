# ZTK Upstream Audit Playbook

## Purpose

This document is an operator guide for re-auditing ZTK coverage when upstream `mi-lib` repositories change.

The goal is not to redesign `ztk-ts` from scratch each time. The goal is to answer these questions consistently:

1. Did any upstream library add new ZTK tags or keys?
2. Did any existing tag/key change accepted payload shape, precedence, or printing behavior?
3. Does `ztk-ts` still read all observed upstream vocabulary without dropping information?

## Primary Targets

When asked to check for newly added ZTK vocabulary, inspect these repositories first:

- `zeda`
- `zm`
- `zeo`
- `roki`
- `roki-gl`
- `roki-fd`

Current expectation:

- `zeda` defines generic parser/evaluator behavior, not domain tag/key inventories.
- `zm` mostly contributes token/value readers such as vector/matrix helpers, not section/tag inventories.
- `zeo` and `roki` are the primary sources of ZTK tag/key definitions used by the viewer/editor stack.
- `roki-gl` and `roki-fd` currently appear to reuse existing `zeo` / `roki` readers rather than define their own ZTK vocabularies.

## Audit Scope

For each target repository, answer all of the following:

1. Does it define any `ZTK_TAG_*` or `ZTK_KEY_*` symbols?
2. Does it define any `ZTKPrp` tables for new tags or keys?
3. Does it implement new `*FromZTK`, `*ReadZTK`, `*FPrintZTK`, or `_ZTKEvalKey` / `_ZTKEvalTag` call sites that imply new accepted syntax?
4. Do examples, tests, or apps use ZTK files that contain syntax not yet represented in `ztk-ts` docs/tests?

## Search Checklist

### For `zeo` and `roki`

Search for:

- `ZTK_TAG_`
- `ZTK_KEY_`
- `ZTKPrp`
- `_ZTKEvalKey`
- `_ZTKEvalTag`
- `FromZTK`
- `ReadZTK`
- `FPrintZTK`

Prioritize:

- public headers under `include/`
- parser/reader implementations under `src/`
- examples that write or read `.ztk`

What to extract:

- full tag inventory
- accepted keys per tag
- repeated-key counts via `ZTKPrp.num`
- source-order or precedence-sensitive behavior
- serializer output order from `*FPrintZTK`

### For `zeda`

Search for:

- `ZTKParse`
- `ZTKEvalKey`
- `ZTKEvalTag`
- tokenization and comment handling
- include/import syntax

What to extract:

- parser grammar changes
- evaluator ordering behavior
- repeated-key/tag overflow behavior
- quotation/comment/include semantics

Do not expect domain-specific tag/key inventories here.

### For `zm`

Search for:

- `FromZTK`
- ZTK-backed scalar/vector/matrix readers
- token/value conversion helpers

What to extract:

- value parsing behavior that may affect `ztk-ts` tokenization or numeric interpretation
- new helper formats that imply broader generic value syntax

Do not treat `zm` as a primary source of section/tag inventories unless it newly introduces `ZTK_TAG_*` / `ZTK_KEY_*`.

### For `roki-gl` and `roki-fd`

Search for:

- `ZTK_TAG_`
- `ZTK_KEY_`
- `ZTKPrp`
- `ReadZTK`
- `FromZTK`

What to extract:

- whether they define their own ZTK vocabulary
- whether they only delegate to `zeo` / `roki` readers
- whether examples use existing tags in previously unseen combinations

If they only call existing readers, record that there is no inventory expansion.

## Decision Rules

### No action needed

If a repository:

- adds no new `ZTK_TAG_*` / `ZTK_KEY_*`
- adds no new `ZTKPrp` table
- only delegates to existing `zeo` / `roki` readers

then update notes only if useful, and do not expand `ztk-ts` semantic coverage.

### Docs-only update

If upstream behavior changes but `ztk-ts` already preserves the syntax safely, update:

- `docs/ztk-spec-notes.md`
- `docs/ztk-tag-matrix.md`

Examples:

- new warning/precedence behavior
- clarified serializer order
- newly confirmed exclusivity rules

### Code update required

Update `ztk-ts` code when upstream introduces any of:

- a new tag
- a new accepted key under an existing tag
- a new repeated-key pattern
- a new payload structure that is currently dropped or misparsed
- a new serializer rule that normalized output should preserve

In that case:

1. update semantic types only as far as the meaning is actually known
2. preserve unstructured token payloads when full semantics are still unclear
3. add regression tests before or with the implementation

## Required Outputs

After each audit, produce a concise summary with these sections:

### Inventory result

- which repositories were checked
- whether any new tags were found
- whether any new keys were found

### Behavior result

- ordering/precedence changes
- serializer changes
- warning/validation changes

### `ztk-ts` impact

- no action
- docs update only
- code/tests/docs update required

## If New Libraries Become In Scope

If a future task adds another `mi-lib` repository, inspect it in this order:

1. public headers for `ZTK_TAG_*` / `ZTK_KEY_*`
2. `src/` for `ZTKPrp`, `_ZTKEvalKey`, `_ZTKEvalTag`, `FromZTK`, `ReadZTK`, `FPrintZTK`
3. examples/tests/apps that read or write `.ztk`
4. HISTORY / changelog entries mentioning ZTK

Classify the new repository into one of these buckets:

- inventory source: defines new tag/key vocabulary
- behavior source: changes parser/evaluator/value semantics
- consumer only: reuses existing readers without new vocabulary

Only the first bucket should normally expand the `ztk-ts` tag/key matrix.

## Notes For Future Maintainers

- Treat `zeo` and `roki` as the authoritative domain vocabulary sources unless another repository proves otherwise.
- Treat `zeda` as the authoritative parser/evaluator behavior source.
- Treat `zm` as a generic value-format reference, not a tag inventory source.
- Prefer upstream code over samples when samples and implementation disagree.
- Prefer preserving unknown payloads over over-modeling uncertain semantics.
