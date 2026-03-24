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

今回の整理では sample に加えて、各ライブラリの `ZTKPrp` table と `_ZTKEvalTag` / `_ZTKEvalKey` の呼び出しを追って、
「実装が実際に受理する tag / key 集合」を基準に inventory を更新しています。

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
- `%` 行コメントがある
- `include` によるファイル取り込みがある
- tagless field が許される
- keyless field も parser 上は生成されうる

`zeda_ztk.c` / `ZTKEvalKey()` / `ZTKEvalTag()` から確認できる evaluator 側の特徴は次です。

- key と tag の評価順は source order
- `ZTKPrp.num` を超えた repeated key / tag は warning を出して無視される
- つまり upstream 実装では「優先順位」より「入力順の上書き / 逐次適用」で意味が決まる箇所がある
- `roki::link.rot` と `zeo::shape.rot` はまさにこの source-order 依存の処理

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

上流 parser 実装上の補足:

- `roki::chain` reader は `roki::chain`, `roki::chain::init`, `roki::motor`, `roki::link` に加えて `zeo::optic`, `zeo::texture`, `zeo::shape` も同一ファイルで読む
- `zeo` の multishape reader が直接読む tag は `zeo::optic`, `zeo::texture`, `zeo::shape`
- `zeo::map` の type 実装として現時点で確認できたのは `terra` のみ
- `roki::chain::ik` と `roki::contact` は独立 reader を持つ

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

実装メモ:

- `mirror` は `zeo_shape3d.c` の挙動に合わせて shape 参照として解決する
- `texture` は `zeo::texture` section を semantic 化し、shape から name 参照解決する
- `import` は `<filename> [scale]` を保持し、optional scale も normalized serializer で再出力する
- `zeo::map` は `terra` の主要 key と repeated `grid` を semantic で保持する
- `roki::chain::ik` は `joint` と `constraint` を semantic 化し、既知 constraint type では `link` / `at` / `w` を構造化する
- `roki::contact` は `bind` と摩擦係数群を semantic 化し、rigid/elastic は source-order 上で最後に見つかった group を active type として扱う
- `DH` は `zFrame3DFromDH()` と同じ modified DH 式で `resolved.frame` に落とす
- `rot` は `zAAFromZTK()` + `zMat3DRot()` に合わせて angle-axis として解釈し、source-order で現在の姿勢へ逐次 left-multiply する
- `sphere` / `cone` / `cylinder` / `capsule` の repeated primitive key は `_ZTKEvalKey(..., num: N)` に合わせて必要数のみ読む
- validation として `repeated-key-overflow`, `missing-required-key` の一部、`duplicate-contact-bind` を診断できる
- diagnostics は `validation` と `serialization-policy` を分け、前者は parse/resolve 上の不整合、後者は normalized semantic serializer の意図的な正規化・省略を表す
- normalized semantic serializer は upstream 寄せの policy diagnostics を返し、少なくとも `viscos -> viscosity`, named `chain::init` key -> `joint`, inactive `roki::contact` group の省略、non-`bump` texture `depth` の省略を明示する
- 現在の repo 内 fixture corpus sweep では unknown key / diagnostics は clean

## 未解決事項

次は把握しているが、初回の semantic 実装を止めるほどではない論点です。

- quotation の厳密な扱い
- `revolute passive` の正確な意味
- `bind` の意味
- `density` と `mass` の優先順位
- `roki::chain::ik` の未知 constraint type を generic token 列以上にどう model 化するか
- `roki::contact` の duplicate `bind` や pair 重複 warning を validation にどこまで寄せるか
- `zeo::texture` の `coord` 必須制約や画像 reader 依存挙動を validation にどこまで寄せるか
- `zeo::map` の `terra` 以外の map type が将来増えた場合の semantic 拡張方針
