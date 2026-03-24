# ZTK Import Policy

## Purpose

この文書は、`zeo::shape` の `import:` を `ztk-ts` でどう扱うかの決定事項を整理するためのメモです。

`import` は単なる任意 callback ではなく、upstream `zeo` の対応拡張子と import 挙動に寄せた policy を持つ。

## Upstream Baseline

upstream `zeo` の `zShape3DImportFromZTK()` / `_zShape3DReadFileEXT()` では、`import:` に対して次の拡張子を扱う。

- `.ztk`
- `.stl`
- `.obj`
- `.ply`
- `.dae`
  - `DAE` は build option 依存

外部 mesh file (`stl/obj/ply/dae`) は内部で主に `polyhedron` として読み込まれる。
`import` は参照として保持されるのではなく、read 時に実体化される寄りの動作をする。

## Current `ztk-ts` Policy

`ztk-ts` では semantic model 上は `importName` / `importScale` を保持する。
これは authoring 情報を失わないためであり、normalized save では `import:` を保持する。

一方、`materialize-runtime` では `import` を解決して concrete geometry に置換できる。

## API Policy

`materialize-runtime` の import 解決は、public API では user-supplied callback を受け取らず、`ztk-ts` 内部の format-aware resolver dispatch で扱う。

- `ztk-ts` 側が `importName` から拡張子を判定し、内部 resolver に `source.format` を渡す
- resolver 実装詳細は public API に出さない
- `.ztk` built-in loader は imported shape 自身の transform (`pos` / `att` / `rot` / `frame`) を geometry に bake して返す
- `.obj` built-in loader は upstream `zPH3DFReadOBJ()` に寄せて `v` / `f` のみを読み、face は先頭 3 index を使って polyhedron 化する
- `.stl` built-in loader は upstream `zPH3DReadFileSTL()` に寄せて ASCII / binary STL の両方を受け、facet を deduplicate しながら polyhedron 化する
- `.ply` built-in loader は upstream `zPH3DReadFilePLY()` に寄せて ASCII / binary little-endian / binary big-endian を受け、`vertex` / `face` element を polyhedron 化する
- ただし procedural polyhedron を回転付き transform で bake する経路は未実装なので、現状は `import-resolution-failed` とする

`source.format` の候補:

- `ztk`
- `stl`
- `obj`
- `ply`
- `dae`
- `unknown`

## Diagnostics Policy

`materialize-runtime` では import に対して次の診断を使い分ける。

- `unsupported-import-format`
  - `importName` の拡張子が upstream 想定外
- `requires-external-shape-import`
  - format 自体は想定内だが、外部 geometry 実体が semantic model にない
- `unsupported-import-resolution`
  - format は upstream 想定内だが、`ztk-ts` 側の built-in loader がまだ未実装
  - 現状は `dae` がこれに該当する
- `import-resolution-failed`
  - built-in loader が動いたが、対象 file が壊れている、読めない、shape 化できない等で失敗した
  - 現状は `.ztk` import の file read / parse / nested materialization failure で使う
- `materializes-shape-import`
  - import を concrete geometry に置換できた

これにより、「未対応 format」と「対応 format だが file/loader が失敗した」を分離できる。

## Responsibility Split

- `ztk-ts core`
  - semantic model
  - import format 判定
  - diagnostic policy
  - materialized runtime serializer
- internal import resolver implementation
  - 実際の file access
  - STL/PLY/OBJ/DAE/ZTK loader
  - geometry への変換

この分離により、core は upstream 互換の policy を持ちつつ、IO や heavy loader を直接抱え込まない。

## Near-term Plan

直近では次の段階で進める。

1. public callback を廃止して internal import dispatch に置換
2. format 判定と import diagnostics を `ztk-ts` 側へ寄せる
3. built-in loader 未実装 format は `unsupported-import-resolution` に揃える
4. `.ztk` import から内製対応を始め、残りの mesh format は順次追加する
