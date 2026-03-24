# ZTK タグ一覧

## 要約

この表は `ztk-ts` の初期 tag/key 調査結果です。
semantic model の最初の実装は `P1` を優先するのが妥当です。

## タグ一覧

| Tag | Package | Priority | Main keys | Notes |
| --- | --- | --- | --- | --- |
| `roki::chain` | roki | P1 | `name` | chain 全体の名前 |
| `roki::chain::init` | roki | P1 | `pos`, `att`, `frame`, `joint` | 初期姿勢と初期関節値 |
| `roki::link` | roki | P1 | `name`, `jointtype`, `mass`, `density`, `stuff`, `COM`, `inertia`, `pos`, `att`, `rot`, `frame`, `DH`, `shape`, `parent`, `bind` と joint 依存 key | viewer / editor の中心 |
| `roki::motor` | roki | P1 | `name`, `type`, `min`, `max`, `motorconstant`, `admittance`, `maxvoltage`, `minvoltage`, `gearratio`, `rotorinertia`, `gearinertia`, `compk`, `compl` | motor specification |
| `zeo::optic` | zeo | P1 | `name`, `ambient`, `diffuse`, `specular`, `esr`, `shininess`, `alpha` | material 相当 |
| `zeo::shape` | zeo | P1 | `name`, `type`, `optic`, `texture`, `mirror`, `import`, `pos`, `att`, `rot`, `frame` と shape 固有 key | shape 本体 |
| `roki::chain::ik` | roki | P2 | `joint`, `constraint` | key 数は少ないが `constraint` の payload は型依存 |
| `roki::contact` | roki | P2 | `bind`, `staticfriction`, `kineticfriction`, `compensation`, `relaxation`, `elasticity`, `viscosity` | 接触モデル |
| `zeo::texture` | zeo | P2 | `name`, `file`, `type`, `depth`, `coord`, `face` | texture 対応用 |
| `zeo::map` | zeo | P3 | `name`, `type` と type 依存 key | upstream 実装では現状 `terra` のみ確認 |

調査基準:

- この表は sample ではなく upstream の `_ZTKEvalTag` / `_ZTKEvalKey` と `ZTKPrp` table を基準にしている
- 現時点で `roki` / `zeo` が直接受理する ZTK tag は上の 9 個で打ち止め
- `roki::chain` の reader は `zeo::optic` / `zeo::texture` / `zeo::shape` を同じファイル内で併読する

## `roki::link`

### 共通 key

| Key | 意味 | Notes |
| --- | --- | --- |
| `name` | link 名 | ほぼ必須 |
| `jointtype` | joint 種別 | semantic 分岐の主キー |
| `mass` | 質量 | `density` と関係する可能性あり |
| `density` | 密度 | shape 由来の質量特性で使う可能性 |
| `stuff` | 接触・材質分類 | `roki::contact` と関係する |
| `COM` | 重心 | 3 要素 |
| `inertia` | 慣性テンソル | 3x3 |
| `pos` | 位置 | frame の簡略表現の一部 |
| `att` | 姿勢 | frame の簡略表現の一部 |
| `rot` | 回転操作 | 繰り返しの可能性あり |
| `frame` | 親 link からの変換 | 3x4 相当 |
| `DH` | DH パラメータ | 変換の別表現 |
| `shape` | shape 参照 | 繰り返し可 |
| `parent` | 親 link 名 | 木構造の接続 |
| `bind` | 束縛 link 名 | 意味は未確定 |

補足:

- `DH` は `zeo` / `roki` 実装に合わせて modified DH として `resolved.frame` に解決する
- `viscos` は corpus 互換の別名として `viscosity` に寄せて扱う
- `roki::chain::init` では `joint: ...` に加えて `<linkName>: ...` 形式の named joint state も読む

### joint 依存 key

| Key | Used by | Notes |
| --- | --- | --- |
| `dis` | 多くの joint | 初期変位 |
| `min` | active joint | 下限 |
| `max` | active joint | 上限 |
| `stiffness` | active joint | ばね係数 |
| `viscosity` | active joint | 粘性摩擦 |
| `coulomb` | active joint | クーロン摩擦 |
| `staticfriction` | active joint | 静止摩擦 |
| `motor` | active joint | `roki::motor` 参照 |
| `forcethreshold` | `breakablefloat` | 破断閾値 |
| `torquethreshold` | `breakablefloat` | 破断閾値 |

### joint type ごとの key 実装

| Joint type | Accepted keys |
| --- | --- |
| `fixed` | 追加 key なし |
| `revolute` | `dis`, `min`, `max`, `stiffness`, `viscosity`, `coulomb`, `staticfriction`, `motor` |
| `prismatic` | `dis`, `min`, `max`, `stiffness`, `viscosity`, `coulomb`, `staticfriction`, `motor` |
| `cylindrical` | `dis`, `min`, `max`, `stiffness`, `viscosity`, `coulomb`, `staticfriction` |
| `hooke` | `dis`, `min`, `max`, `stiffness`, `viscosity`, `coulomb`, `staticfriction` |
| `spherical` | `dis`, `motor` |
| `planar` | `dis` |
| `float` | `dis` |
| `breakablefloat` | `dis`, `forcethreshold`, `torquethreshold` |

### 確認できた joint type

- `fixed`
- `revolute`
- `prismatic`
- `cylindrical`
- `hooke`
- `spherical`
- `planar`
- `float`
- `breakablefloat`

## `roki::contact`

| Key | 意味 | Notes |
| --- | --- | --- |
| `bind` | stuff の組 | 2 要素 |
| `staticfriction` | 静止摩擦係数 | |
| `kineticfriction` | 動摩擦係数 | rigid / elastic 共通 |
| `compensation` | 剛体接触補償係数 | rigid group |
| `relaxation` | 剛体接触緩和係数 | rigid group |
| `elasticity` | 弾性係数 | elastic group |
| `viscosity` | 粘性係数 | elastic group |

補足:

- `compensation` / `relaxation` と `elasticity` / `viscosity` は排他的な group で、upstream では source-order 上で最後に見つかった group が active type を決める
- `ztk-ts` では全 raw 値を保持した上で `contactType` を `rigid` / `elastic` として解釈し、normalized serializer は active type の group のみ再出力する

## `roki::motor`

### 共通 key

| Key | 意味 |
| --- | --- |
| `name` | motor spec 名 |
| `type` | motor 種別 |
| `min` | 最小トルクなど |
| `max` | 最大トルクなど |
| `motorconstant` | DC motor 定数 |
| `admittance` | アドミタンス |
| `maxvoltage` | 最大電圧 |
| `minvoltage` | 最小電圧 |
| `gearratio` | 減速比 |
| `rotorinertia` | ロータ慣性 |
| `gearinertia` | ギア慣性 |
| `compk` | 補償パラメータ |
| `compl` | 補償パラメータ |

### 確認できた type

- `none`
- `dc`
- `trq`

## `zeo::shape`

### 共通 key

| Key | 意味 | Notes |
| --- | --- | --- |
| `name` | shape 名 | 参照先 |
| `type` | shape type | semantic 分岐の主キー |
| `optic` | optic 名 | `zeo::optic` 参照 |
| `texture` | texture 名 | `zeo::texture` 参照 |
| `mirror` | 別 shape の鏡像 | serializer で注意 |
| `import` | 外部 shape 取り込み | serializer で注意 |
| `pos` | 位置 | |
| `att` | 姿勢 | |
| `rot` | 回転操作 | 繰り返しの可能性あり |
| `frame` | 変換 | |

補足:

- `mirror` は `<shapeName> <axis>` を保持し、name 参照解決も行う
- `sphere` / `cone` / `cylinder` / `capsule` の repeated primitive key は `zeo` 実装同様に必要数だけ消費し、余分な値は unknown key にしない
- `polyhedron` の `loop` は procedural token 列として保持し、normalized serializer で再出力する
- `nurbs` の `dim` は semantic で保持する

### type 別 key

| Type | Keys |
| --- | --- |
| `box` | `center`, `ax`, `ay`, `az`, `depth`, `width`, `height` |
| `sphere` | `center`, `radius`, `div` |
| `cylinder` | `center` x2, `radius`, `div` |
| `cone` | `center`, `vert`, `radius`, `div` |
| `capsule` | `center` x2, `radius`, `div` |
| `ellipsoid` | `center`, `ax`, `ay`, `az`, `rx`, `ry`, `rz`, `div` |
| `ellipticcylinder` | `center` x2, `radius` x2, `ref`, `div` |
| `polyhedron` | `vert` xN, `face` xN, 必要に応じて `loop`, `prism`, `pyramid` |
| `nurbs` | `uknot`, `vknot`, `size`, `cp`, `slice` |

## `zeo::optic`

| Key | 意味 |
| --- | --- |
| `name` | optic 名 |
| `ambient` | ambient 色 |
| `diffuse` | diffuse 色 |
| `specular` | specular 色 |
| `esr` | 反射特性 |
| `shininess` | shininess |
| `alpha` | 透明度 |

## `zeo::texture`

| Key | 意味 |
| --- | --- |
| `name` | texture 名 |
| `file` | 画像ファイル |
| `type` | texture 種別 |
| `depth` | bump 深さ |
| `coord` | UV 座標 |
| `face` | UV face |

補足:

- `coord` と `face` は repeated key
- upstream 実装では `coord` が 1 件も無い texture は warning 扱いで読めない
- `type` は `color` / `bump` を確認
- `depth` は semantic では保持しても、normalized serializer では `bump` のときだけ出力する
- `ztk-ts` では `coord` を `{ index, uv }`、`face` を index triple として semantic 化している

## `roki::chain::ik`

| Key | 意味 | Notes |
| --- | --- | --- |
| `joint` | IK 対象関節 | `<linkName> [weight] [joint displacement...]` 形式。`all` も許可 |
| `constraint` | IK 制約 | `<priority> <name> <type> ...` 形式。残り payload は `type` ごとに異なる |

### `constraint` type

| Type | Payload |
| --- | --- |
| `world_pos` | link 名 1 個, 任意で attention point, 任意で weight |
| `world_att` | link 名 1 個, 任意で weight |
| `l2l_pos` | link 名 2 個まで, 任意で attention point, 任意で weight |
| `l2l_att` | link 名 2 個まで, 任意で weight |
| `com` | 任意で weight |
| `angular_momentum` | 任意で attention point, 任意で weight |
| `angular_momentum_about_com` | 任意で weight |

補足:

- `constraint` の追加 payload は key-value ではなく token 列
- `weight` は 3 要素、`attention point` も 3 要素で parser 側では位置依存に近い解釈になる
- `ztk-ts` では既知 type に対して `linkNames` / `attentionPoint` / `weight` を構造化し、未知部分は token 列で保持する

## `zeo::map`

| Key | 意味 | Notes |
| --- | --- | --- |
| `name` | map 名 | |
| `type` | map type | upstream 実装では `terra` を確認 |

### `terra` type 別 key

| Key | 意味 |
| --- | --- |
| `origin` | 原点 |
| `resolution` | グリッド解像度 |
| `size` | グリッドサイズ |
| `zrange` | 高さ範囲 |
| `th_var` | 可走判定しきい値 |
| `th_grd` | 勾配しきい値 |
| `th_res` | 分解能しきい値 |
| `grid` | セル本体 |

補足:

- `ztk-ts` では `grid` を `(i, j, z, nx, ny, nz, var, travs)` の structured record として保持している
- `th_grd` は upstream printer では度数法で出力されるため、semantic でも raw degree 値を保持する

## AST で必ず保持するもの

- repeated `shape`
- repeated `vert`
- repeated `face`
- repeated `coord`
- repeated `rot`
- repeated `joint`
- repeated `constraint`
- repeated `grid`
