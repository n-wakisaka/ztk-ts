import {
  analyzeSemanticZtkMaterializedRuntime,
  parseZtk,
  resolveZtk,
  serializeSemanticZtkMaterializedRuntime,
} from '../src/index.js';

// このサンプルは runtime/export 向け materialization の考え方を示します。
// normalize-semantic との違いは、「authoring 情報を一部失っても runtime で扱いやすい形に寄せる」
// ことにあります。

const sourceText = `
[zeo::shape]
name: imported
import: hand_mesh.stl 2

[zeo::shape]
name: mirrored
mirror: imported x
texture: checker
`;

const semantic = resolveZtk(parseZtk(sourceText));

// 1. まず preflight で「この文書を materialize できるか」を確認します。
//    現時点の ztk-ts では import の format 判定までは内部で行いますが、
//    built-in loader は `.ztk` / `.obj` / `.stl` / `.ply` まで実装済みなので、
//    この例を `.dae` などに変えると supported: false になります。
//    supported: false になります。
const blockedAnalysis = analyzeSemanticZtkMaterializedRuntime(semantic);
console.log('blocked analysis:', blockedAnalysis);

// 2. 実際に materialized runtime export を行います。
//    import は format-aware に扱われますが、未実装 format loader は
//    ztk-ts 側の diagnostic (`unsupported-import-resolution`) として返されます。
const materialized = serializeSemanticZtkMaterializedRuntime(semantic);

console.log('materialized layer:', materialized.layer);
console.log('materialized supported:', materialized.supported);
console.log('materialized text:\n', materialized.text);
console.log('materialized diagnostics:', materialized.diagnostics);

// ここで注目したい点:
// - import は拡張子に応じて format-aware に判定される
// - `.ztk` / `.obj` / `.stl` / `.ply` import は built-in loader で runtime materialization できる
// - upstream 想定外の拡張子は unsupported-import-format
// - upstream 想定内でも、built-in loader が未実装なら unsupported-import-resolution
// - built-in loader が動いても file 読み込みや shape 化に失敗したら import-resolution-failed
// - texture や transform のような、shape 自体の付随情報はそのまま残る
// - ただし import/mirror という「どう作ったか」の情報は失われる
//
// つまりこの API は通常 save 用ではなく、runtime/export 用として使うのが前提です。
