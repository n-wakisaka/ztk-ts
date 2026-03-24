# ZTK 仕様メモ

## 目的

この文書は `ztk-ts` の Phase 0 調査結果の初版です。
次の upstream 実装とサンプルから、`ztk-ts` の parser / semantic model / serializer を設計するための前提を整理しています。

- `mi-lib/zeda`
- `mi-lib/roki`
- `mi-lib/zeo`

主に確認したものは次です。

- `zeda/README.ZTK.md`
- `roki/include/roki/*.h`
- `zeo/include/zeo/*.h`
- `roki` / `zeo` 配下の `.ztk` サンプル

## 構文メモ

`zeda/README.ZTK.md` から読み取れる ZTK の構文的特徴は次の通りです。

- tag は `[tag]`
- key は `key: value`
- 区切りとして空白、カンマ、セミコロン、括弧 `()`、波括弧 `{}` が受理される
- 括弧の対応はかなり緩い
- 複数行 value が許される
- 同じ tag の繰り返しが許される
- 同じ key の繰り返しが許される
- quotation は通常の token 分割と異なる意味を持つ

現時点の `ztk-ts` は quotation をまだ厳密には扱っていません。

## 設計上の含意

ZTK は構文だけでは意味が決まらず、各ライブラリの後段解釈で意味が確定します。
そのため `ztk-ts` では、少なくとも次の層を分離する必要があります。

1. raw AST
2. resolver / semantic model
3. serializer / validation

特に重要なのは次です。

- repeated key を保持する必要がある
- 未知 tag / key を保持する必要がある
- 同じ key 名でも tag や type によって意味が変わる
- `type` と `jointtype` は semantic 分岐の主キーになる

## 確認できた主要タグ

関連ライブラリで確認できた主要 tag は次です。

- `roki::chain`
- `roki::chain::init`
- `roki::chain::ik`
- `roki::link`
- `roki::motor`
- `roki::contact`
- `zeo::optic`
- `zeo::texture`
- `zeo::shape`
- `zeo::map`

## `ztk-ts` 初期実装の優先順位

最初に semantic 化する対象:

1. `roki::chain`
2. `roki::chain::init`
3. `roki::motor`
4. `roki::link`
5. `zeo::optic`
6. `zeo::shape`

初版 viewer までは raw / unknown 扱いでよい対象:

- `roki::chain::ik`
- `roki::contact`
- `zeo::texture`
- `zeo::map`

## joint type

コードまたはサンプルで確認できた `jointtype` は次です。

- `fixed`
- `revolute`
- `prismatic`
- `cylindrical`
- `hooke`
- `spherical`
- `planar`
- `float`
- `breakablefloat`

未確定事項:

- サンプルに `jointtype: revolute passive` がある

## motor type

コード上で確認できた motor type は次です。

- `none`
- `dc`
- `trq`

## shape type

`zeo` 実装で確認できた `zeo::shape` type は次です。

- `box`
- `sphere`
- `cylinder`
- `cone`
- `capsule`
- `ellipsoid`
- `ellipticcylinder`
- `polyhedron`
- `nurbs`

注意点:

- header comment と runtime `typestr` が一致しない箇所がある
- semantic 解決では comment より実装の `typestr` を優先するほうが安全

## 未解決事項

次は把握しているが、初回の semantic 実装を止めるほどではない論点です。

- quotation の厳密な扱い
- `revolute passive` の正確な意味
- `bind` の意味
- `density` と `mass` の優先順位
- `pos` / `att` / `rot` / `frame` / `DH` の優先順位
- `mirror` / `import` の serializer 上の扱い
- 初版 viewer で `texture` / `map` をどこまで未対応にできるか
