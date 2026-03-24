import {
  parseZtk,
  resolveZtk,
  semanticToAst,
  serializeSemanticZtkNormalized,
  serializeSemanticZtkPreservingSource,
  serializeZtk,
  serializeZtkNormalized,
} from '../src/index.js';

// このファイルは ztk-ts の基本 API を人が追いやすい形で並べたサンプルです。
// テストのように最小断片だけを検証するのではなく、
// 「ZTK を読み、意味解釈し、どの保存 API を選ぶか」を順番に眺められるようにしています。

const sourceText = `
% このコメントは preserve-source では残り、semantic normalized では落ちます。
[roki::link]
name: base
jointtype: fixed

[roki::link]
name: arm
jointtype: revolute
parent: base
viscos: 0.1
rot: 0 0 1 90

[roki::chain::init]
arm: 1.2
`;

// 1. まずは生の ZTK 文字列を AST にパースします。
//    この段階では「タグやキーの並び」と「元の書き方」を保持することが主目的です。
const ast = parseZtk(sourceText);

// 2. AST をそのまま文字列へ戻すと、元の記述に近い形で再出力されます。
//    editor 的に「まだ semantic 正規化したくない」ケースではこの系統を使います。
const rawRoundTripText = serializeZtk(ast);

// 3. AST 正規化は、意味解釈はせずに「フォーマットだけ」揃えます。
//    カンマや空白の揺れを整えたいが、semantic policy までは適用したくないとき用です。
const astNormalizedText = serializeZtkNormalized(ast);

// 4. semantic 解釈では、alias 解釈・参照解決・validation diagnostics の収集を行います。
//    ここから先は「どのように書かれていたか」より「最終的にどう解釈されるか」を主に扱います。
const semantic = resolveZtk(ast);

// validation diagnostics は「読み取れない」「参照が切れている」などの問題を表します。
console.log('validation diagnostics:', semantic.diagnostics);

// 5. semantic model を AST に戻すと、意味的に解釈済みのデータから AST を再構成できます。
//    これは内部的な round-trip や normalized serializer の土台になります。
const semanticAst = semanticToAst(semantic);
const semanticAstText = serializeZtkNormalized(semanticAst);

// 6. preserve-source は semantic document が持っている source AST をそのまま返します。
//    「semantic は済ませたが、保存は元の書き方を優先したい」場合の API です。
const preserving = serializeSemanticZtkPreservingSource(semantic);

// 7. normalize-semantic は semantic model を正本として代表表現へ畳みます。
//    例えばこの入力では以下が起きます。
//    - viscos -> viscosity
//    - named chain::init key (arm:) -> joint: arm ...
//    - rot のような transform 記法 -> canonical frame
//    - コメントは落ちる
const normalized = serializeSemanticZtkNormalized(semantic);

console.log('raw round-trip text:\n', rawRoundTripText);
console.log('AST normalized text:\n', astNormalizedText);
console.log('semanticToAst text:\n', semanticAstText);
console.log('preserve-source layer:', preserving.layer);
console.log('preserve-source text:\n', preserving.text);
console.log('normalize-semantic layer:', normalized.layer);
console.log('normalize-semantic text:\n', normalized.text);
console.log('normalize-semantic diagnostics:', normalized.diagnostics);

// 期待される読み方:
// - 元のコメントや key alias を残したければ preserve-source
// - 意味が同じ表現を代表形へ揃えたければ normalize-semantic
// - ただの AST 整形なら serializeZtkNormalized(ast)
