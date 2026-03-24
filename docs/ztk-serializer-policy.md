# ZTK Serializer Policy

## Purpose

この文書は `ztk-ts` の serializer responsibility を分離しつつ、`serializeSemanticZtkNormalized()` が semantic model から normalized ZTK を出力するときの方針を固定するためのメモです。

## Serialization Layers

`ztk-ts` では serializer の責務を次の 3 層に分ける。

- `preserve-source`
  - source AST をそのまま保存する層
  - lossless save / editor round-trip 用
  - API: `serializeSemanticZtkPreservingSource()`
- `normalize-semantic`
  - semantic model を正本として意味上の揺れだけを畳む層
  - alias 正規化、inactive key の整理、transform canonicalization などを行う
  - API: `serializeSemanticZtkNormalized()`
- `materialize-runtime`
  - runtime/export 向けに `mirror` / `import` / transform を展開しうる層
  - upstream `FPrintZTK` 寄りの不可逆 export を隔離する
  - 現時点では未実装

この分離により、lossless save と runtime export を同じ API に押し込めない。

対象:

- 何を semantic 正本として保持するか
- normalized output で何を正規化するか
- normalized output で何を省略するか
- そのときどの `serialization-policy` diagnostic を出すか

validation failure と serializer policy も分けて扱います。

- `validation` diagnostics:
  - `resolveZtk()` が返す
  - 読めない、壊れている、参照解決できない、必須 key が足りない、など
- `serialization-policy` diagnostics:
  - `serializeSemanticZtkNormalized()` が返す
  - normalized output で意図的に alias を畳んだ、inactive key を落とした、source-only 情報を落とした、など
  - `effect` で挙動の性質を分ける
    - `canonicalization`: 意味は保ったまま代表表現へ畳む
    - `source-loss`: source 上の記述や inactive detail を捨てる
    - `runtime-materialization`: 将来の runtime export で不可逆展開するときに使う

## Global Rules

- `preserve-source` は semantic document が持つ source AST をそのまま出力する
- `normalize-semantic` は semantic model を正本とする
- source comment と tagless key/value は保持しない
- unknown section / unknown key は semantic model に保持されている限り再出力する
- formatting は `serializeZtkNormalized()` に委ねる
- `materialize-runtime` でのみ、runtime 都合の不可逆展開を許容する

## Current Policy

### Source-level inputs

- `preserve-source` では source comment / tagless key/value を保持する
- comment 行は再出力しない
  - diagnostic: `drops-source-comments`
- tagless key/value は再出力しない
  - diagnostic: `drops-tagless-keyvalue`

### `roki::chain::init`

- named joint state key は semantic では `linkName + values` として保持する
- normalized output では `joint: <linkName> ...` へ統一する
  - diagnostic: `normalizes-chain-init-joint-key`
- transform key は source-order に依存するため、normalized output では canonical `frame` 1 個に畳む
  - diagnostic: `normalizes-transform-to-frame`
- `joint` / named joint state の並びは保持しつつ、transform 部分だけを resolved pose に正規化する

### `roki::link`

- `viscos` alias は semantic で `viscosity` として解釈する
- normalized output では `viscosity` のみ出す
  - diagnostic: `normalizes-key-alias`
- transform key は source-order に依存するため、normalized output では canonical `frame` 1 個に畳む
  - diagnostic: `normalizes-transform-to-frame`
- joint-related key は `jointtype` の accepted set に合わせて再出力する
- 既知 joint type で未使用 key は normalized output から省く
  - diagnostic: `drops-inactive-link-joint-key`
- unknown joint type では joint-related key を安全側で保持する

### `roki::contact`

- rigid / elastic group は source-order で最後に有効になった group を semantic の active type とする
- normalized output では active group の key だけを出す
- inactive group の key は再出力しない
  - diagnostic: `drops-inactive-contact-key`

### `zeo::texture`

- `depth` は semantic では保持する
- normalized output では `type: bump` のときだけ `depth` を出す
- non-`bump` texture の `depth` は省略する
  - diagnostic: `drops-nonbump-texture-depth`

### `zeo::shape`

- shape source は `mirror > import > type/geometry` で扱う
- normalized output では active source だけを残す
- `mirror` が active のとき:
  - `import`, `type`, geometry key を省く
- `import` が active のとき:
  - `type`, geometry key を省く
- `optic`, `texture`, transform は現時点では source に関係なく保持する
- この点は current policy として regression test で固定しているが、upstream 再監査の余地は残る
- inactive source の key は normalized output から省く
  - diagnostic: `drops-inactive-shape-key`
- transform key は source-order に依存するため、normalized output では canonical `frame` 1 個に畳む
  - diagnostic: `normalizes-transform-to-frame`
- upstream `FPrintZTK` は `mirror` / `import` / transform を保持せず resolved shape を出力するが、これは `normalize-semantic` では採用しない
- その種の不可逆展開は将来の `materialize-runtime` 層で扱う

### transform keys

- 対象 key は `pos`, `att`, `rot`, `frame`, `DH`
- normalized semantic serialization では raw transform 手順ではなく resolved transform を優先する
- raw transform が 1 つでもあれば、normalized output では resolved pose を表す single `frame` を出す
- これにより source-order 依存の precedence 差を消し、再読込時の意味を安定化する

## Next Expansion Targets

次に policy を固定する候補:

- `materialize-runtime` export の shape policy 設計
- `zeo::shape` で `optic` / `texture` / transform が mirror/import source とどう干渉するかの upstream 再確認
- corpus 全体で `serializeSemanticZtkNormalized()` の policy diagnostics を snapshot 的に監視する回帰追加
