import {
  createDocument,
  type ZtkDocument,
  type ZtkKeyValueNode,
  type ZtkNode,
  type ZtkSection,
} from './ast.js';
import { createSerializationDiagnostic, type ZtkSerializationDiagnostic } from './diagnostics.js';
import { loadImportedShapeGeometry } from './import-resolver.js';
import { readNodeFileTextSync } from './node-file-access.js';
import { parseZtk } from './parse.js';
import type {
  ZtkMat3,
  ZtkProceduralLoop,
  ZtkSemanticDocument,
  ZtkShape,
  ZtkShapeGeometry,
  ZtkVec3,
} from './semantic.js';
import { resolveZtk } from './semantic.js';
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

export type ZtkImportedShapeFormat = 'ztk' | 'stl' | 'obj' | 'ply' | 'dae' | 'unknown';

export type ZtkImportedShapeSource = {
  importName: string;
  importScale?: number;
  format: ZtkImportedShapeFormat;
};

export type ZtkImportedShapeResolution =
  | {
      kind: 'resolved';
      geometry: ZtkShapeGeometry;
    }
  | {
      kind: 'failed';
      code: 'unsupported-import-resolution' | 'import-resolution-failed';
      message: string;
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

function inferImportedShapeFormat(importName: string | undefined): ZtkImportedShapeFormat {
  if (!importName) {
    return 'unknown';
  }

  const lastDot = importName.lastIndexOf('.');
  if (lastDot < 0 || lastDot === importName.length - 1) {
    return 'unknown';
  }

  const suffix = importName.slice(lastDot + 1).toLowerCase();
  switch (suffix) {
    case 'ztk':
    case 'stl':
    case 'obj':
    case 'ply':
    case 'dae':
      return suffix;
    default:
      return 'unknown';
  }
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

function scaleVec3(value: ZtkVec3, scale: number): ZtkVec3 {
  return [value[0] * scale, value[1] * scale, value[2] * scale];
}

function multiplyMat3Vec3(matrix: ZtkMat3, value: ZtkVec3): ZtkVec3 {
  return [
    matrix[0] * value[0] + matrix[1] * value[1] + matrix[2] * value[2],
    matrix[3] * value[0] + matrix[4] * value[1] + matrix[5] * value[2],
    matrix[6] * value[0] + matrix[7] * value[1] + matrix[8] * value[2],
  ];
}

function addVec3(left: ZtkVec3, right: ZtkVec3): ZtkVec3 {
  return [left[0] + right[0], left[1] + right[1], left[2] + right[2]];
}

function transformPoint(att: ZtkMat3, pos: ZtkVec3, value: ZtkVec3): ZtkVec3 {
  return addVec3(multiplyMat3Vec3(att, value), pos);
}

function transformDirection(att: ZtkMat3, value: ZtkVec3): ZtkVec3 {
  return multiplyMat3Vec3(att, value);
}

function isIdentityMat3(matrix: ZtkMat3): boolean {
  return (
    matrix[0] === 1 &&
    matrix[1] === 0 &&
    matrix[2] === 0 &&
    matrix[3] === 0 &&
    matrix[4] === 1 &&
    matrix[5] === 0 &&
    matrix[6] === 0 &&
    matrix[7] === 0 &&
    matrix[8] === 1
  );
}

function scaleProceduralLoop(loop: ZtkProceduralLoop, scale: number): ZtkProceduralLoop {
  const commands = loop.commands.map((command) => {
    if (command.kind === 'point') {
      return {
        kind: 'point' as const,
        point: [command.point[0] * scale, command.point[1] * scale] as [number, number],
      };
    }

    return {
      kind: 'arc' as const,
      direction: command.direction,
      radius: command.radius * scale,
      div: command.div,
      endpoint: command.endpoint
        ? ([command.endpoint[0] * scale, command.endpoint[1] * scale] as [number, number])
        : undefined,
    };
  });

  return {
    planeAxis: loop.planeAxis,
    planeValue: loop.planeValue * scale,
    commands,
    tokens: [],
  };
}

function scaleImportedShapeGeometry(
  geometry: ZtkShapeGeometry,
  scale: number | undefined,
): ZtkImportedShapeResolution {
  if (scale === undefined || scale === 1) {
    return {
      kind: 'resolved',
      geometry,
    };
  }

  if (!isGeometryType(geometry, 'polyhedron')) {
    return {
      kind: 'failed',
      code: 'import-resolution-failed',
      message: `Import scale is only supported for polyhedron geometry, but resolved ".ztk" shape type is "${geometry.type}"`,
    };
  }

  const proceduralLoopDefs = geometry.proceduralLoopDefs.map((loop) =>
    scaleProceduralLoop(loop, scale),
  );

  return {
    kind: 'resolved',
    geometry: {
      ...geometry,
      vertices: geometry.vertices.map((vertex) => scaleVec3(vertex as ZtkVec3, scale)),
      proceduralLoops: proceduralLoopDefs.map((loop) => proceduralLoopToTokens(loop)),
      proceduralLoopDefs,
      prisms: geometry.prisms.map((prism) => scaleVec3(prism as ZtkVec3, scale)),
      pyramids: geometry.pyramids.map((pyramid) => scaleVec3(pyramid as ZtkVec3, scale)),
    },
  };
}

function transformProceduralLoop(loop: ZtkProceduralLoop, pos: ZtkVec3): ZtkProceduralLoop {
  const planeAxis = loop.planeAxis === 'x' ? 0 : loop.planeAxis === 'y' ? 1 : 2;
  const loopOffset =
    planeAxis === 0
      ? ([pos[1], pos[2]] as [number, number])
      : planeAxis === 1
        ? ([pos[2], pos[0]] as [number, number])
        : ([pos[0], pos[1]] as [number, number]);

  const commands = loop.commands.map((command) => {
    if (command.kind === 'point') {
      return {
        kind: 'point' as const,
        point: [command.point[0] + loopOffset[0], command.point[1] + loopOffset[1]] as [
          number,
          number,
        ],
      };
    }

    return {
      kind: 'arc' as const,
      direction: command.direction,
      radius: command.radius,
      div: command.div,
      endpoint: command.endpoint
        ? ([command.endpoint[0] + loopOffset[0], command.endpoint[1] + loopOffset[1]] as [
            number,
            number,
          ])
        : undefined,
    };
  });

  return {
    planeAxis: loop.planeAxis,
    planeValue: loop.planeValue + pos[planeAxis],
    commands,
    tokens: [],
  };
}

function bakeImportedShapeTransform(
  geometry: ZtkShapeGeometry,
  shape: ZtkShape,
): ZtkImportedShapeResolution {
  const { pos, att } = shape.transform.resolved;
  const hasTranslation = pos[0] !== 0 || pos[1] !== 0 || pos[2] !== 0;
  const hasRotation = !isIdentityMat3(att);

  if (!hasTranslation && !hasRotation) {
    return {
      kind: 'resolved',
      geometry,
    };
  }

  if (isGeometryType(geometry, 'box')) {
    return {
      kind: 'resolved',
      geometry: {
        ...geometry,
        center: geometry.center ? transformPoint(att, pos, geometry.center) : pos,
        ax:
          geometry.ax && geometry.ax !== 'auto'
            ? transformDirection(att, geometry.ax)
            : geometry.ax,
        ay:
          geometry.ay && geometry.ay !== 'auto'
            ? transformDirection(att, geometry.ay)
            : geometry.ay,
        az:
          geometry.az && geometry.az !== 'auto'
            ? transformDirection(att, geometry.az)
            : geometry.az,
      },
    };
  }

  if (isGeometryType(geometry, 'sphere')) {
    return {
      kind: 'resolved',
      geometry: {
        ...geometry,
        center: geometry.center ? transformPoint(att, pos, geometry.center) : pos,
      },
    };
  }

  if (isGeometryType(geometry, 'cylinder') || isGeometryType(geometry, 'capsule')) {
    return {
      kind: 'resolved',
      geometry: {
        ...geometry,
        centers: geometry.centers.map((center) => transformPoint(att, pos, center as ZtkVec3)),
      },
    };
  }

  if (isGeometryType(geometry, 'cone')) {
    return {
      kind: 'resolved',
      geometry: {
        ...geometry,
        center: geometry.center ? transformPoint(att, pos, geometry.center) : pos,
        vert: geometry.vert ? transformPoint(att, pos, geometry.vert) : undefined,
      },
    };
  }

  if (isGeometryType(geometry, 'ellipsoid')) {
    return {
      kind: 'resolved',
      geometry: {
        ...geometry,
        center: geometry.center ? transformPoint(att, pos, geometry.center) : pos,
        ax:
          geometry.ax && geometry.ax !== 'auto'
            ? transformDirection(att, geometry.ax)
            : geometry.ax,
        ay:
          geometry.ay && geometry.ay !== 'auto'
            ? transformDirection(att, geometry.ay)
            : geometry.ay,
        az:
          geometry.az && geometry.az !== 'auto'
            ? transformDirection(att, geometry.az)
            : geometry.az,
      },
    };
  }

  if (isGeometryType(geometry, 'ellipticcylinder')) {
    return {
      kind: 'resolved',
      geometry: {
        ...geometry,
        centers: geometry.centers.map((center) => transformPoint(att, pos, center as ZtkVec3)),
        ref: geometry.ref ? transformDirection(att, geometry.ref) : undefined,
      },
    };
  }

  if (isGeometryType(geometry, 'polyhedron')) {
    if (geometry.proceduralLoopDefs.length > 0) {
      if (hasRotation) {
        return {
          kind: 'failed',
          code: 'import-resolution-failed',
          message:
            'Imported ".ztk" procedural polyhedron cannot be materialized with a non-identity transform yet',
        };
      }

      const proceduralLoopDefs = geometry.proceduralLoopDefs.map((loop) =>
        transformProceduralLoop(loop, pos),
      );

      return {
        kind: 'resolved',
        geometry: {
          ...geometry,
          proceduralLoops: proceduralLoopDefs.map((loop) => proceduralLoopToTokens(loop)),
          proceduralLoopDefs,
          prisms: geometry.prisms.map((prism) => addVec3(prism as ZtkVec3, pos)),
          pyramids: geometry.pyramids.map((pyramid) => addVec3(pyramid as ZtkVec3, pos)),
        },
      };
    }

    return {
      kind: 'resolved',
      geometry: {
        ...geometry,
        vertices: geometry.vertices.map((vertex) => transformPoint(att, pos, vertex as ZtkVec3)),
      },
    };
  }

  if (isGeometryType(geometry, 'nurbs')) {
    return {
      kind: 'resolved',
      geometry: {
        ...geometry,
        controlPoints: geometry.controlPoints.map((point) => {
          const transformed = transformPoint(att, pos, [
            point[3] ?? 0,
            point[4] ?? 0,
            point[5] ?? 0,
          ]);
          return [
            point[0] ?? 0,
            point[1] ?? 0,
            point[2] ?? 1,
            transformed[0],
            transformed[1],
            transformed[2],
          ];
        }),
      },
    };
  }

  return {
    kind: 'failed',
    code: 'import-resolution-failed',
    message: `Imported ".ztk" shape transform is not supported for geometry type "${geometry.type}"`,
  };
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
  diagnostics: ZtkSerializationDiagnostic[];
  cache: WeakMap<ZtkShape, ZtkShape | undefined>;
  active: WeakSet<ZtkShape>;
};

function createMaterializationContext(
  diagnostics: ZtkSerializationDiagnostic[],
): MaterializationContext {
  return {
    diagnostics,
    cache: new WeakMap(),
    active: new WeakSet(),
  };
}

function resolveImportedShape(
  _shape: ZtkShape,
  source: ZtkImportedShapeSource,
): ZtkImportedShapeResolution {
  if (source.format !== 'ztk') {
    const loaded = loadImportedShapeGeometry(_shape, source);
    if (loaded.kind === 'failed') {
      return loaded;
    }

    const transformed = bakeImportedShapeTransform(loaded.geometry, _shape);
    if (transformed.kind === 'failed') {
      return transformed;
    }

    return scaleImportedShapeGeometry(transformed.geometry, source.importScale);
  }

  const textResult = readNodeFileTextSync(source.importName);
  if (!textResult.ok) {
    return {
      kind: 'failed',
      code:
        textResult.code === 'filesystem-unavailable'
          ? 'unsupported-import-resolution'
          : 'import-resolution-failed',
      message:
        textResult.code === 'filesystem-unavailable'
          ? textResult.message
          : `Failed to read imported ".ztk" shape "${source.importName}": ${textResult.message}`,
    };
  }
  const text = textResult.value;

  const imported = resolveZtk(parseZtk(text));
  const importedShape = imported.shapes[0];
  if (!importedShape) {
    return {
      kind: 'failed',
      code: 'import-resolution-failed',
      message: `Imported ".ztk" shape "${source.importName}" does not contain a zeo::shape section`,
    };
  }

  const nestedContext = createMaterializationContext([]);
  const materialized = materializeRuntimeShape(importedShape, nestedContext);
  if (!materialized) {
    const nestedDetail = nestedContext.diagnostics[0]?.message;
    return {
      kind: 'failed',
      code: 'import-resolution-failed',
      message: nestedDetail
        ? `Failed to materialize imported ".ztk" shape "${source.importName}": ${nestedDetail}`
        : `Failed to materialize imported ".ztk" shape "${source.importName}"`,
    };
  }

  const transformed = bakeImportedShapeTransform(materialized.geometry, importedShape);
  if (transformed.kind === 'failed') {
    return transformed;
  }

  return scaleImportedShapeGeometry(transformed.geometry, source.importScale);
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
): ZtkMaterializedRuntimeSerializationAnalysis {
  const diagnostics: ZtkSerializationDiagnostic[] = [];
  const context = createMaterializationContext(diagnostics);
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

  const importSource: ZtkImportedShapeSource = {
    importName: shape.importName ?? '',
    importScale: shape.importScale,
    format: inferImportedShapeFormat(shape.importName),
  };
  if (importSource.format === 'unknown') {
    pushDiagnostic(context.diagnostics, {
      code: 'unsupported-import-format',
      effect: 'runtime-materialization',
      message: `Unsupported import format for "${importSource.importName}"`,
      tag: 'zeo::shape',
      key: 'import',
    });
    context.active.delete(shape);
    context.cache.set(shape, undefined);
    return undefined;
  }

  const resolution = resolveImportedShape(shape, importSource);
  if (resolution.kind === 'failed') {
    pushDiagnostic(context.diagnostics, {
      code: resolution.code,
      effect: 'runtime-materialization',
      message: resolution.message,
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
    message: `Runtime materialization replaces import source "${shape.importName}" (${importSource.format}) with resolved shape geometry`,
    tag: 'zeo::shape',
    key: 'import',
  });

  const materialized = {
    ...shape,
    type: resolution.geometry.type,
    mirrorName: undefined,
    mirrorAxis: undefined,
    importName: undefined,
    importScale: undefined,
    mirror: undefined,
    geometry: resolution.geometry,
  };
  context.active.delete(shape);
  context.cache.set(shape, materialized);
  return materialized;
}

export function serializeSemanticZtkMaterializedRuntime(
  document: ZtkSemanticDocument,
): ZtkMaterializedRuntimeSerialization {
  const diagnostics: ZtkSerializationDiagnostic[] = [];
  const materializedShapes: ZtkShape[] = [];
  const context = createMaterializationContext(diagnostics);

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
