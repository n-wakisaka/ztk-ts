import {
  createDocument,
  type ZtkDocument,
  type ZtkKeyValueNode,
  type ZtkNode,
  type ZtkSection,
} from './ast.js';
import { createSerializationDiagnostic, type ZtkSerializationDiagnostic } from './diagnostics.js';
import type {
  ZtkProceduralLoop,
  ZtkSemanticDocument,
  ZtkShape,
  ZtkShapeGeometry,
  ZtkVec3,
} from './semantic.js';
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

export type ZtkMaterializedRuntimeSerializationAnalysis = {
  layer: 'materialize-runtime';
  supported: boolean;
  diagnostics: ZtkSerializationDiagnostic[];
};

export type ZtkMaterializedRuntimeSerialization = {
  layer: 'materialize-runtime';
  supported: boolean;
  ast?: ZtkDocument;
  text?: string;
  diagnostics: ZtkSerializationDiagnostic[];
};

export type ZtkMaterializedRuntimeGeometryResolver = (
  shape: ZtkShape,
) => ZtkShapeGeometry | undefined;

export type ZtkMaterializedRuntimeSerializationOptions = {
  resolveImportedShapeGeometry?: ZtkMaterializedRuntimeGeometryResolver;
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

function mirrorVec3(value: ZtkVec3, axis: string): ZtkVec3 {
  const mirrored: ZtkVec3 = [...value];
  if (axis === 'x') {
    mirrored[0] *= -1;
  } else if (axis === 'y') {
    mirrored[1] *= -1;
  } else if (axis === 'z') {
    mirrored[2] *= -1;
  }

  return mirrored;
}

function mirrorOptionalVec3(value: ZtkVec3 | undefined, axis: string): ZtkVec3 | undefined {
  return value ? mirrorVec3(value, axis) : undefined;
}

function mirrorOptionalAxis(
  value: ZtkVec3 | 'auto' | undefined,
  axis: string,
): ZtkVec3 | 'auto' | undefined {
  if (!value || value === 'auto') {
    return value;
  }
  return mirrorVec3(value, axis);
}

function mirrorNurbsControlPoint(point: number[], axis: string): number[] {
  const mirrored = [...point];
  const index = axis === 'x' ? 3 : axis === 'y' ? 4 : axis === 'z' ? 5 : -1;

  if (index >= 0 && index < mirrored.length) {
    const value = mirrored[index];
    if (value !== undefined) {
      mirrored[index] = -value;
    }
  }

  return mirrored;
}

function proceduralLoopAxes(planeAxis: string): { first: string; second: string } {
  switch (planeAxis) {
    case 'x':
      return { first: 'y', second: 'z' };
    case 'y':
      return { first: 'z', second: 'x' };
    case 'z':
      return { first: 'x', second: 'y' };
    default:
      return { first: 'x', second: 'y' };
  }
}

function invertArcDirection(direction: string): string {
  if (direction === 'cw') {
    return 'ccw';
  }
  if (direction === 'ccw') {
    return 'cw';
  }
  return direction;
}

function mirrorProceduralLoop(loop: ZtkProceduralLoop, axis: string): ZtkProceduralLoop {
  const axes = proceduralLoopAxes(loop.planeAxis);
  const flipsPlaneValue = axis === loop.planeAxis;
  const flipFirst = axis === axes.first;
  const flipSecond = axis === axes.second;
  const flipsInPlane = flipFirst || flipSecond;

  const commands = loop.commands.map((command) => {
    if (command.kind === 'point') {
      const point: [number, number] = [
        flipFirst ? -command.point[0] : command.point[0],
        flipSecond ? -command.point[1] : command.point[1],
      ];
      return {
        kind: 'point' as const,
        point,
      };
    }

    const endpoint: [number, number] | undefined = command.endpoint
      ? [
          flipFirst ? -command.endpoint[0] : command.endpoint[0],
          flipSecond ? -command.endpoint[1] : command.endpoint[1],
        ]
      : undefined;

    return {
      kind: 'arc' as const,
      direction: flipsInPlane ? invertArcDirection(command.direction) : command.direction,
      radius: command.radius,
      div: command.div,
      endpoint,
    };
  });

  return {
    planeAxis: loop.planeAxis,
    planeValue: flipsPlaneValue ? -loop.planeValue : loop.planeValue,
    commands,
    tokens: [],
  };
}

function proceduralLoopToTokens(loop: ZtkProceduralLoop): string[] {
  const tokens = [loop.planeAxis, `${loop.planeValue}`];

  for (const command of loop.commands) {
    if (command.kind === 'point') {
      tokens.push(`${command.point[0]}`, `${command.point[1]}`);
      continue;
    }

    tokens.push('arc', command.direction, `${command.radius}`, `${command.div}`);
    if (command.endpoint) {
      tokens.push(`${command.endpoint[0]}`, `${command.endpoint[1]}`);
    }
  }

  return tokens;
}

function reverseFace<T>(face: T[]): T[] {
  if (face.length < 2) {
    return [...face];
  }
  return [face[0] as T, ...face.slice(1).reverse()];
}

function isGeometryType<TType extends ZtkShapeGeometry['type']>(
  geometry: ZtkShapeGeometry,
  type: TType,
): geometry is Extract<ZtkShapeGeometry, { type: TType }> {
  return geometry.type === type;
}

function mirrorShapeGeometry(
  geometry: ZtkShapeGeometry,
  axis: string,
): ZtkShapeGeometry | undefined {
  if (isGeometryType(geometry, 'box')) {
    return {
      ...geometry,
      center: mirrorOptionalVec3(geometry.center, axis),
      ax: mirrorOptionalAxis(geometry.ax, axis),
      ay: mirrorOptionalAxis(geometry.ay, axis),
      az: mirrorOptionalAxis(geometry.az, axis),
    };
  }
  if (isGeometryType(geometry, 'sphere')) {
    return {
      ...geometry,
      center: mirrorOptionalVec3(geometry.center, axis),
    };
  }
  if (isGeometryType(geometry, 'cylinder') || isGeometryType(geometry, 'capsule')) {
    return {
      ...geometry,
      centers: geometry.centers.map((center: ZtkVec3) => mirrorVec3(center, axis)),
    };
  }
  if (isGeometryType(geometry, 'cone')) {
    return {
      ...geometry,
      center: mirrorOptionalVec3(geometry.center, axis),
      vert: mirrorOptionalVec3(geometry.vert, axis),
    };
  }
  if (isGeometryType(geometry, 'ellipsoid')) {
    return {
      ...geometry,
      center: mirrorOptionalVec3(geometry.center, axis),
      ax: mirrorOptionalAxis(geometry.ax, axis),
      ay: mirrorOptionalAxis(geometry.ay, axis),
      az: mirrorOptionalAxis(geometry.az, axis),
    };
  }
  if (isGeometryType(geometry, 'ellipticcylinder')) {
    return {
      ...geometry,
      centers: geometry.centers.map((center: ZtkVec3) => mirrorVec3(center, axis)),
      ref: mirrorOptionalVec3(geometry.ref, axis),
    };
  }
  if (isGeometryType(geometry, 'polyhedron')) {
    if (geometry.proceduralLoopDefs.length > 0) {
      const proceduralLoopDefs = geometry.proceduralLoopDefs.map((loop) =>
        mirrorProceduralLoop(loop, axis),
      );

      return {
        ...geometry,
        vertices: [],
        faces: [],
        loops: [],
        proceduralLoops: proceduralLoopDefs.map((loop) => proceduralLoopToTokens(loop)),
        proceduralLoopDefs,
        prisms: geometry.prisms.map((prism) => mirrorVec3(prism as ZtkVec3, axis)),
        pyramids: geometry.pyramids.map((pyramid) => mirrorVec3(pyramid as ZtkVec3, axis)),
      };
    }

    if (geometry.loops.length > 0 || geometry.prisms.length > 0 || geometry.pyramids.length > 0) {
      return undefined;
    }

    return {
      ...geometry,
      vertices: geometry.vertices.map((vert) => mirrorVec3(vert as ZtkVec3, axis)),
      faces: geometry.faces.map((face) => reverseFace(face)),
    };
  }
  if (isGeometryType(geometry, 'nurbs')) {
    return {
      ...geometry,
      controlPoints: geometry.controlPoints.map((point) => mirrorNurbsControlPoint(point, axis)),
    };
  }

  return undefined;
}

type MaterializationContext = {
  options: ZtkMaterializedRuntimeSerializationOptions;
  diagnostics: ZtkSerializationDiagnostic[];
  cache: WeakMap<ZtkShape, ZtkShape | undefined>;
  active: WeakSet<ZtkShape>;
};

function createMaterializationContext(
  diagnostics: ZtkSerializationDiagnostic[],
  options: ZtkMaterializedRuntimeSerializationOptions,
): MaterializationContext {
  return {
    options,
    diagnostics,
    cache: new WeakMap(),
    active: new WeakSet(),
  };
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

export function analyzeSemanticZtkMaterializedRuntime(
  document: ZtkSemanticDocument,
  options: ZtkMaterializedRuntimeSerializationOptions = {},
): ZtkMaterializedRuntimeSerializationAnalysis {
  const diagnostics: ZtkSerializationDiagnostic[] = [];
  const context = createMaterializationContext(diagnostics, options);
  let supported = true;

  for (const shape of document.shapes) {
    if (!materializeRuntimeShape(shape, context)) {
      supported = false;
    }
  }

  return {
    layer: 'materialize-runtime',
    supported,
    diagnostics,
  };
}

function materializeRuntimeShape(
  shape: ZtkShape,
  context: MaterializationContext,
): ZtkShape | undefined {
  const cached = context.cache.get(shape);
  if (cached !== undefined || context.cache.has(shape)) {
    return cached;
  }

  if (context.active.has(shape)) {
    pushDiagnostic(context.diagnostics, {
      code: 'unsupported-shape-materialization',
      effect: 'runtime-materialization',
      message: 'Runtime materialization does not support cyclic mirror dependencies',
      tag: 'zeo::shape',
      key: 'mirror',
    });
    context.cache.set(shape, undefined);
    return undefined;
  }

  context.active.add(shape);

  if (!shape.mirrorName && !shape.importName) {
    context.active.delete(shape);
    context.cache.set(shape, shape);
    return shape;
  }

  if (shape.mirrorName) {
    pushDiagnostic(context.diagnostics, {
      code: 'materializes-shape-mirror',
      effect: 'runtime-materialization',
      message: `Runtime materialization replaces mirror source "${shape.mirrorName}" with resolved shape geometry`,
      tag: 'zeo::shape',
      key: 'mirror',
    });

    if (!shape.mirror || !shape.mirrorAxis) {
      pushDiagnostic(context.diagnostics, {
        code: 'unsupported-shape-materialization',
        effect: 'runtime-materialization',
        message: 'Mirror materialization requires a resolved mirror source and axis',
        tag: 'zeo::shape',
        key: 'mirror',
      });
      context.active.delete(shape);
      context.cache.set(shape, undefined);
      return undefined;
    }

    const sourceShape = materializeRuntimeShape(shape.mirror, context);
    if (!sourceShape) {
      context.active.delete(shape);
      context.cache.set(shape, undefined);
      return undefined;
    }

    const geometry = mirrorShapeGeometry(sourceShape.geometry, shape.mirrorAxis);
    if (!geometry) {
      pushDiagnostic(context.diagnostics, {
        code: 'unsupported-shape-materialization',
        effect: 'runtime-materialization',
        message: `Runtime materialization does not yet support mirrored geometry type "${sourceShape.geometry.type}"`,
        tag: 'zeo::shape',
        key: 'mirror',
      });
      context.active.delete(shape);
      context.cache.set(shape, undefined);
      return undefined;
    }

    const materialized = {
      ...shape,
      type: geometry.type,
      mirrorName: undefined,
      mirrorAxis: undefined,
      importName: undefined,
      importScale: undefined,
      mirror: undefined,
      geometry,
    };
    context.active.delete(shape);
    context.cache.set(shape, materialized);
    return materialized;
  }

  const resolvedImportGeometry = context.options.resolveImportedShapeGeometry?.(shape);
  if (!resolvedImportGeometry) {
    pushDiagnostic(context.diagnostics, {
      code: 'requires-external-shape-import',
      effect: 'runtime-materialization',
      message:
        'Runtime materialization of imported shapes requires external geometry that is not preserved in the semantic model',
      tag: 'zeo::shape',
      key: 'import',
    });
    context.active.delete(shape);
    context.cache.set(shape, undefined);
    return undefined;
  }

  pushDiagnostic(context.diagnostics, {
    code: 'materializes-shape-import',
    effect: 'runtime-materialization',
    message: `Runtime materialization replaces import source "${shape.importName}" with externally resolved shape geometry`,
    tag: 'zeo::shape',
    key: 'import',
  });

  const materialized = {
    ...shape,
    type: resolvedImportGeometry.type,
    mirrorName: undefined,
    mirrorAxis: undefined,
    importName: undefined,
    importScale: undefined,
    mirror: undefined,
    geometry: resolvedImportGeometry,
  };
  context.active.delete(shape);
  context.cache.set(shape, materialized);
  return materialized;
}

export function serializeSemanticZtkMaterializedRuntime(
  document: ZtkSemanticDocument,
  options: ZtkMaterializedRuntimeSerializationOptions = {},
): ZtkMaterializedRuntimeSerialization {
  const diagnostics: ZtkSerializationDiagnostic[] = [];
  const materializedShapes: ZtkShape[] = [];
  const context = createMaterializationContext(diagnostics, options);

  for (const shape of document.shapes) {
    const materialized = materializeRuntimeShape(shape, context);
    if (!materialized) {
      return {
        layer: 'materialize-runtime',
        supported: false,
        diagnostics,
      };
    }
    materializedShapes.push(materialized);
  }

  const materializedDocument: ZtkSemanticDocument = {
    ...document,
    shapes: materializedShapes,
  };
  const ast = semanticToAst(materializedDocument, {
    normalizeLinkJointKeys: true,
    normalizeShapeSource: true,
    normalizeTransforms: true,
  });

  return {
    layer: 'materialize-runtime',
    supported: true,
    ast,
    text: serializeZtkNormalized(ast),
    diagnostics,
  };
}
