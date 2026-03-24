# ZTK タグ一覧

## 要約

この表は `ztk-ts` の初期 tag/key 調査結果です。
semantic model の最初の実装は `P1` を優先するのが妥当です。

## タグ一覧

| Tag | Package | Priority | Main keys | Notes |
| --- | --- | --- | --- | --- |
| `roki::chain` | roki | P1 | `name` | chain 全体の名前 |
| `roki::chain::init` | roki | P1 | `pos`, `att`, `frame`, `joint` | 初期姿勢と初期関節値 |
| `roki::link` | roki | P1 | `name`, `jointtype`, `mass`, `density`, `stuff`, `COM`, `inertia`, `pos`, `att`, `rot`, `frame`, `DH`, `shape`, `parent`, `bind` | viewer / editor の中心 |
| `roki::motor` | roki | P1 | `name`, `type`, `min`, `max`, `motorconstant`, `admittance`, `maxvoltage`, `minvoltage`, `gearratio`, `rotorinertia`, `gearinertia`, `compk`, `compl` | motor specification |
| `zeo::optic` | zeo | P1 | `name`, `ambient`, `diffuse`, `specular`, `esr`, `shininess`, `alpha` | material 相当 |
| `zeo::shape` | zeo | P1 | `name`, `type`, `optic`, `texture`, `mirror`, `import`, `pos`, `att`, `rot`, `frame` と shape 固有 key | shape 本体 |
| `roki::chain::ik` | roki | P2 | `joint`, `constraint` | 初版 viewer では後回し可 |
| `roki::contact` | roki | P2 | `bind`, `staticfriction`, `kineticfriction`, `compensation`, `relaxation`, `elasticity`, `viscosity` | 接触モデル |
| `zeo::texture` | zeo | P2 | `name`, `file`, `type`, `depth`, `coord`, `face` | texture 対応用 |
| `zeo::map` | zeo | P3 | `name`, `type` | 初期スコープ外 |

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

## AST で必ず保持するもの

- repeated `shape`
- repeated `vert`
- repeated `face`
- repeated `coord`
- repeated `rot`
- repeated `joint`
- repeated `constraint`
