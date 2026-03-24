import {
  createDocument,
  type ZtkDocument,
  type ZtkKeyValueNode,
  type ZtkNode,
  type ZtkSection,
} from './ast.js';
import { createSerializationDiagnostic, type ZtkSerializationDiagnostic } from './diagnostics.js';
import type { ZtkSemanticDocument } from './semantic.js';
import { semanticToAst } from './semantic-ast.js';
import { serializeZtk, serializeZtkNormalized } from './serialize.js';

export type ZtkSemanticSerializationLayer =
  | 'preserve-source'
  | 'normalize-semantic'
  | 'materialize-runtime';

export type ZtkSourcePreservingSemanticSerialization = {
  layer: 'preserve-source';
  ast: ZtkDocument;
  text: string;
  diagnostics: [];
};

export type ZtkNormalizedSemanticSerialization = {
  layer: 'normalize-semantic';
  ast: ZtkDocument;
  text: string;
  diagnostics: ZtkSerializationDiagnostic[];
};

function pushDiagnostic(
  diagnostics: ZtkSerializationDiagnostic[],
  diagnostic: Omit<ZtkSerializationDiagnostic, 'kind'>,
): void {
  diagnostics.push(createSerializationDiagnostic(diagnostic));
}

function cloneNode(node: ZtkNode): ZtkNode {
  switch (node.type) {
    case 'blank':
      return { type: 'blank', raw: node.raw };
    case 'comment':
      return { type: 'comment', raw: node.raw, text: node.text };
    case 'tag':
      return { type: 'tag', raw: node.raw, name: node.name };
    case 'keyValue':
      return {
        type: 'keyValue',
        rawLines: [...node.rawLines],
        key: node.key,
        rawValue: node.rawValue,
        values: [...node.values],
      };
  }
}

function hasNumericTokens(node: ZtkKeyValueNode): boolean {
  return node.values.length > 0 && node.values.every((token) => !Number.isNaN(Number(token)));
}

function isTransformKey(key: string): boolean {
  return key === 'pos' || key === 'att' || key === 'rot' || key === 'frame' || key === 'DH';
}

function isShapeGeometryKey(key: string): boolean {
  return (
    key === 'center' ||
    key === 'ax' ||
    key === 'ay' ||
    key === 'az' ||
    key === 'depth' ||
    key === 'width' ||
    key === 'height' ||
    key === 'radius' ||
    key === 'div' ||
    key === 'vert' ||
    key === 'ref' ||
    key === 'rx' ||
    key === 'ry' ||
    key === 'rz' ||
    key === 'face' ||
    key === 'loop' ||
    key === 'prism' ||
    key === 'pyramid' ||
    key === 'dim' ||
    key === 'uknot' ||
    key === 'vknot' ||
    key === 'size' ||
    key === 'cp' ||
    key === 'slice'
  );
}

function collectSourceNormalizationDiagnostics(
  source: ZtkSemanticDocument['source'],
  diagnostics: ZtkSerializationDiagnostic[],
): void {
  let hasComments = false;
  let hasTaglessKeyValues = false;
  let insideTaggedSection = false;

  for (const node of source.nodes) {
    if (node.type === 'comment') {
      hasComments = true;
    }
    if (node.type === 'tag') {
      insideTaggedSection = true;
      continue;
    }
    if (node.type === 'blank') {
      continue;
    }
    if (node.type === 'keyValue' && !insideTaggedSection) {
      hasTaglessKeyValues = true;
    }
  }

  if (hasComments) {
    pushDiagnostic(diagnostics, {
      code: 'drops-source-comments',
      effect: 'source-loss',
      message: 'Normalized semantic serialization drops source comments',
      tag: null,
    });
  }

  if (hasTaglessKeyValues) {
    pushDiagnostic(diagnostics, {
      code: 'drops-tagless-keyvalue',
      effect: 'source-loss',
      message: 'Normalized semantic serialization drops tagless key/value entries',
      tag: null,
    });
  }
}

function collectChainInitDiagnostics(
  document: ZtkSemanticDocument,
  diagnostics: ZtkSerializationDiagnostic[],
): void {
  const section = document.chainInit?.section;
  if (!section) {
    return;
  }

  for (const node of section.nodes) {
    if (
      node.key !== 'joint' &&
      node.key !== 'pos' &&
      node.key !== 'att' &&
      node.key !== 'frame' &&
      node.key !== 'DH' &&
      node.key !== 'rot' &&
      hasNumericTokens(node)
    ) {
      pushDiagnostic(diagnostics, {
        code: 'normalizes-chain-init-joint-key',
        effect: 'canonicalization',
        message: `Named chain init key "${node.key}" is normalized to "joint" output`,
        tag: 'roki::chain::init',
        key: node.key,
      });
    }
  }
}

function collectLinkDiagnostics(
  document: ZtkSemanticDocument,
  diagnostics: ZtkSerializationDiagnostic[],
): void {
  const jointKeys = [
    'dis',
    'break',
    'min',
    'max',
    'stiffness',
    'viscosity',
    'coulomb',
    'staticfriction',
    'forcethreshold',
    'torquethreshold',
    'motor',
  ];

  const acceptedKeysByJointType: Partial<Record<string, Set<string>>> = {
    fixed: new Set<string>(),
    revolute: new Set([
      'dis',
      'min',
      'max',
      'stiffness',
      'viscosity',
      'coulomb',
      'staticfriction',
      'motor',
    ]),
    prismatic: new Set([
      'dis',
      'min',
      'max',
      'stiffness',
      'viscosity',
      'coulomb',
      'staticfriction',
      'motor',
    ]),
    cylindrical: new Set([
      'dis',
      'min',
      'max',
      'stiffness',
      'viscosity',
      'coulomb',
      'staticfriction',
    ]),
    hooke: new Set(['dis', 'min', 'max', 'stiffness', 'viscosity', 'coulomb', 'staticfriction']),
    spherical: new Set(['dis', 'motor']),
    planar: new Set(['dis']),
    float: new Set(['dis']),
    breakablefloat: new Set(['dis', 'break', 'forcethreshold', 'torquethreshold']),
  };

  for (const link of document.links) {
    if (link.section.nodes.some((node) => node.key === 'viscos')) {
      pushDiagnostic(diagnostics, {
        code: 'normalizes-key-alias',
        effect: 'canonicalization',
        message: 'Link viscosity alias "viscos" is normalized to "viscosity" output',
        tag: 'roki::link',
        key: 'viscos',
      });
    }

    const acceptedKeys = acceptedKeysByJointType[link.joint.baseType ?? ''];
    if (!acceptedKeys) {
      continue;
    }

    for (const key of jointKeys) {
      if (acceptedKeys.has(key)) {
        continue;
      }
      if (link.section.nodes.some((node) => node.key === key)) {
        pushDiagnostic(diagnostics, {
          code: 'drops-inactive-link-joint-key',
          effect: 'source-loss',
          message: `Link joint key "${key}" is omitted from normalized output for joint type "${link.joint.baseType}"`,
          tag: 'roki::link',
          key,
        });
      }
    }
  }
}

function collectContactDiagnostics(
  section: ZtkSection,
  contactType: 'rigid' | 'elastic' | undefined,
  diagnostics: ZtkSerializationDiagnostic[],
): void {
  const inactiveKeys =
    contactType === 'elastic'
      ? ['compensation', 'relaxation']
      : contactType === 'rigid'
        ? ['elasticity', 'viscosity']
        : [];

  for (const key of inactiveKeys) {
    if (section.nodes.some((node) => node.key === key)) {
      pushDiagnostic(diagnostics, {
        code: 'drops-inactive-contact-key',
        effect: 'source-loss',
        message: `Inactive contact key "${key}" is omitted from normalized output`,
        tag: 'roki::contact',
        key,
      });
    }
  }
}

function collectTextureDiagnostics(
  section: ZtkSection,
  type: string | undefined,
  depth: number | undefined,
  diagnostics: ZtkSerializationDiagnostic[],
): void {
  if (type === 'bump' || depth === undefined) {
    return;
  }

  if (section.nodes.some((node) => node.key === 'depth')) {
    pushDiagnostic(diagnostics, {
      code: 'drops-nonbump-texture-depth',
      effect: 'source-loss',
      message: 'Texture "depth" is omitted from normalized output unless texture type is "bump"',
      tag: 'zeo::texture',
      key: 'depth',
    });
  }
}

function collectShapeDiagnostics(
  section: ZtkSection,
  mirrorName: string | undefined,
  importName: string | undefined,
  diagnostics: ZtkSerializationDiagnostic[],
): void {
  const activeShapeSource = mirrorName ? 'mirror' : importName ? 'import' : 'geometry';

  if (activeShapeSource === 'geometry') {
    return;
  }

  for (const node of section.nodes) {
    const dropsType = node.key === 'type';
    const dropsGeometry = isShapeGeometryKey(node.key);
    const dropsImport = activeShapeSource === 'mirror' && node.key === 'import';

    if (dropsType || dropsGeometry || dropsImport) {
      pushDiagnostic(diagnostics, {
        code: 'drops-inactive-shape-key',
        effect: 'source-loss',
        message: `Shape key "${node.key}" is omitted from normalized output for active shape source "${activeShapeSource}"`,
        tag: 'zeo::shape',
        key: node.key,
      });
    }
  }
}

function collectTransformDiagnostics(
  section: ZtkSection,
  tag: 'roki::chain::init' | 'roki::link' | 'zeo::shape',
  diagnostics: ZtkSerializationDiagnostic[],
): void {
  const transformNodes = section.nodes.filter((node) => isTransformKey(node.key));
  if (transformNodes.length === 0) {
    return;
  }

  const isAlreadyCanonicalFrame = transformNodes.length === 1 && transformNodes[0]?.key === 'frame';
  if (isAlreadyCanonicalFrame) {
    return;
  }

  pushDiagnostic(diagnostics, {
    code: 'normalizes-transform-to-frame',
    effect: 'canonicalization',
    message: 'Transform keys are normalized to a single canonical "frame" output',
    tag,
    key: 'frame',
  });
}

function collectSectionNormalizationDiagnostics(
  document: ZtkSemanticDocument,
  diagnostics: ZtkSerializationDiagnostic[],
): void {
  if (document.chainInit) {
    collectTransformDiagnostics(document.chainInit.section, 'roki::chain::init', diagnostics);
  }

  for (const link of document.links) {
    collectTransformDiagnostics(link.section, 'roki::link', diagnostics);
  }

  for (const shape of document.shapes) {
    collectTransformDiagnostics(shape.section, 'zeo::shape', diagnostics);
    collectShapeDiagnostics(shape.section, shape.mirrorName, shape.importName, diagnostics);
  }

  for (const contact of document.contacts) {
    collectContactDiagnostics(contact.section, contact.contactType, diagnostics);
  }

  for (const texture of document.textures) {
    collectTextureDiagnostics(texture.section, texture.type, texture.depth, diagnostics);
  }
}

export function collectNormalizedSemanticSerializationDiagnostics(
  document: ZtkSemanticDocument,
): ZtkSerializationDiagnostic[] {
  const diagnostics: ZtkSerializationDiagnostic[] = [];

  collectSourceNormalizationDiagnostics(document.source, diagnostics);
  collectChainInitDiagnostics(document, diagnostics);
  collectLinkDiagnostics(document, diagnostics);
  collectSectionNormalizationDiagnostics(document, diagnostics);

  return diagnostics;
}

export function serializeSemanticZtkPreservingSource(
  document: ZtkSemanticDocument,
): ZtkSourcePreservingSemanticSerialization {
  const ast = createDocument(document.source.nodes.map(cloneNode));

  return {
    layer: 'preserve-source',
    ast,
    text: serializeZtk(ast),
    diagnostics: [],
  };
}

export function serializeSemanticZtkNormalized(
  document: ZtkSemanticDocument,
): ZtkNormalizedSemanticSerialization {
  const ast = semanticToAst(document, {
    normalizeLinkJointKeys: true,
    normalizeShapeSource: true,
    normalizeTransforms: true,
  });
  return {
    layer: 'normalize-semantic',
    ast,
    text: serializeZtkNormalized(ast),
    diagnostics: collectNormalizedSemanticSerializationDiagnostics(document),
  };
}
