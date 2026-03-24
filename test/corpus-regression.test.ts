import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import type { ZtkShapeGeometry } from '../src/index.js';
import {
  parseZtk,
  resolveZtk,
  semanticToAst,
  serializeSemanticZtkNormalized,
  serializeZtkNormalized,
} from '../src/index.js';

type CorpusCase = {
  name: string;
  path: URL;
  verify(model: ReturnType<typeof resolveZtk>): void;
};

function fixturePath(relativePath: string): URL {
  return new URL(`./fixtures/corpus/${relativePath}`, import.meta.url);
}

function isPolyhedronGeometry(
  geometry: ZtkShapeGeometry,
): geometry is Extract<ZtkShapeGeometry, { type: 'polyhedron' }> {
  return geometry.type === 'polyhedron';
}

function countDiagnosticsByCode(
  diagnostics: ReadonlyArray<{ code: string }>,
): Record<string, number> {
  const counts: Record<string, number> = {};

  for (const diagnostic of diagnostics) {
    counts[diagnostic.code] = (counts[diagnostic.code] ?? 0) + 1;
  }

  return counts;
}

function normalizeNumericTokens(tokens: string[]): string[] {
  return tokens.map((token) => {
    const value = Number(token);
    return Number.isNaN(value) ? token : `${value}`;
  });
}

const corpusCases: CorpusCase[] = [
  {
    name: 'roki-arm',
    path: fixturePath('roki/arm.ztk'),
    verify(model) {
      expect(model.diagnostics).toEqual([]);
      expect(model.links.some((link) => link.joint.baseType === 'spherical')).toBe(true);
      expect(model.links.some((link) => link.massProperties.com === 'auto')).toBe(true);
      expect(model.links.some((link) => link.massProperties.inertia === 'auto')).toBe(true);
    },
  },
  {
    name: 'roki-dualarm',
    path: fixturePath('roki/dualarm.ztk'),
    verify(model) {
      expect(model.diagnostics).toEqual([]);
      expect(model.chainInit?.jointStates.map((jointState) => jointState.linkName)).toEqual([
        'link11',
        'link21',
      ]);
      expect(model.chainInit?.jointStates.map((jointState) => jointState.values)).toEqual([
        [1.5707963267948966, 0, 0],
        [1.5707963267948966, 0, 0],
      ]);
      expect(model.chainInit?.unknownKeys).toEqual([]);
    },
  },
  {
    name: 'roki-wall',
    path: fixturePath('roki/wall.ztk'),
    verify(model) {
      expect(model.diagnostics).toEqual([]);
      const breakableLinks = model.links.filter((link) => link.joint.baseType === 'breakablefloat');
      expect(breakableLinks).toHaveLength(3);
      expect(breakableLinks.map((link) => link.breakValues)).toEqual([
        [200, 200],
        [10, 10],
        [10, 10],
      ]);
      expect(breakableLinks.map((link) => link.unknownKeys)).toEqual([[], [], []]);
    },
  },
  {
    name: 'roki-invpend',
    path: fixturePath('roki/invpend.ztk'),
    verify(model) {
      expect(model.diagnostics).toEqual([]);
      expect(model.links.map((link) => link.viscosity)).toEqual([undefined, 0, 0, undefined]);
      expect(model.links.map((link) => link.unknownKeys)).toEqual([[], [], [], []]);
    },
  },
  {
    name: 'roki-puma',
    path: fixturePath('roki/puma.ztk'),
    verify(model) {
      expect(model.diagnostics).toEqual([]);
      const upperarm = model.shapes.find((shape) => shape.name === 'upperarm');
      const geometry = upperarm?.geometry;
      expect(geometry?.type).toBe('polyhedron');
      if (geometry && isPolyhedronGeometry(geometry)) {
        expect(geometry.proceduralLoops.map(normalizeNumericTokens)).toEqual([
          [
            'z',
            '0.02',
            '-0.05',
            '-0.06',
            'arc',
            'cw',
            '0.08',
            '24',
            '-0.05',
            '0.06',
            '0.05',
            '0.06',
            '0.2',
            '0.03',
            'arc',
            'cw',
            '0.03',
            '12',
            '0.2',
            '-0.03',
            '0.05',
            '-0.06',
          ],
        ]);
        expect(geometry.proceduralLoopDefs[0]).toEqual(
          expect.objectContaining({
            planeAxis: 'z',
            planeValue: 0.02,
          }),
        );
        expect(geometry.prisms).toEqual([[0, 0, 0.04]]);
      }
    },
  },
  {
    name: 'zeo-ellips',
    path: fixturePath('zeo/ellips.ztk'),
    verify(model) {
      expect(model.diagnostics).toEqual([]);
      expect(model.shapes.map((shape) => shape.geometry.type)).toEqual([
        'ellipsoid',
        'ellipticcylinder',
      ]);
    },
  },
  {
    name: 'zeo-mirror',
    path: fixturePath('zeo/mirror.ztk'),
    verify(model) {
      expect(model.diagnostics).toEqual([]);
      expect(model.shapes.map((shape) => shape.name)).toEqual(['cone', 'cone2']);
      expect(model.shapes[1]?.mirrorName).toBe('cone');
      expect(model.shapes[1]?.mirrorAxis).toBe('y');
      expect(model.shapes[1]?.mirror).toBe(model.shapes[0]);
      expect(model.shapes[1]?.opticName).toBe('cyan');
    },
  },
  {
    name: 'zeo-nurbs',
    path: fixturePath('zeo/nurbs.ztk'),
    verify(model) {
      expect(model.diagnostics).toEqual([]);
      expect(model.shapes[0]?.geometry).toEqual(
        expect.objectContaining({
          type: 'nurbs',
          dim: [3, 3],
        }),
      );
      expect(model.shapes[0]?.unknownKeys).toEqual([]);
    },
  },
  {
    name: 'zeo-scc',
    path: fixturePath('zeo/scc.ztk'),
    verify(model) {
      expect(model.diagnostics).toEqual([]);
      expect(model.shapes.map((shape) => shape.unknownKeys)).toEqual([[], [], []]);
      expect(model.shapes[0]?.geometry).toEqual(
        expect.objectContaining({
          type: 'cone',
          center: [-0.2, 0.2, -0.2],
          vert: [-0.2, 0, 0.1],
          radius: 0.08,
        }),
      );
      expect(model.shapes[1]?.geometry).toEqual(
        expect.objectContaining({
          type: 'sphere',
          center: [-0.2, -0.1, 0],
          radius: 0.1,
        }),
      );
      expect(model.shapes[2]?.geometry).toEqual(
        expect.objectContaining({
          type: 'cylinder',
          centers: [
            [-0.2, -0.1, -0.2],
            [-0.2, 0.2, 0.2],
          ],
          radius: 0.06,
        }),
      );
    },
  },
];

const corpusNormalizedPolicyExpectations: Record<string, Record<string, number>> = {
  'roki/arm.ztk': {
    'drops-source-comments': 1,
  },
  'roki/box.ztk': {},
  'roki/dualarm.ztk': {
    'drops-source-comments': 1,
    'normalizes-chain-init-joint-key': 2,
  },
  'roki/invpend.ztk': {
    'normalizes-key-alias': 2,
  },
  'roki/puma.ztk': {
    'drops-source-comments': 1,
    'normalizes-transform-to-frame': 6,
  },
  'roki/wall.ztk': {},
  'zeo/box.ztk': {},
  'zeo/ellips.ztk': {},
  'zeo/mirror.ztk': {
    'drops-source-comments': 1,
  },
  'zeo/nurbs.ztk': {},
  'zeo/scc.ztk': {},
};

describe('ztk corpus regression', () => {
  for (const corpusCase of corpusCases) {
    test(`resolves ${corpusCase.name}`, () => {
      const source = readFileSync(corpusCase.path, 'utf8');
      const model = resolveZtk(parseZtk(source));

      corpusCase.verify(model);
    });

    test(`round-trips ${corpusCase.name}`, () => {
      const source = readFileSync(corpusCase.path, 'utf8');
      const original = resolveZtk(parseZtk(source));
      const regenerated = resolveZtk(parseZtk(serializeZtkNormalized(semanticToAst(original))));

      corpusCase.verify(regenerated);
    });

    test(`semantic-normalized save/reload preserves ${corpusCase.name} without new validation failures`, () => {
      const source = readFileSync(corpusCase.path, 'utf8');
      const original = resolveZtk(parseZtk(source));
      const serialized = serializeSemanticZtkNormalized(original);
      const regenerated = resolveZtk(parseZtk(serialized.text));

      expect(regenerated.diagnostics).toEqual([]);
      corpusCase.verify(regenerated);
    });
  }

  for (const [relativePath, expectedDiagnostics] of Object.entries(
    corpusNormalizedPolicyExpectations,
  )) {
    test(`tracks normalized policy diagnostics for ${relativePath}`, () => {
      const source = readFileSync(fixturePath(relativePath), 'utf8');
      const model = resolveZtk(parseZtk(source));
      const serialized = serializeSemanticZtkNormalized(model);

      expect(countDiagnosticsByCode(serialized.diagnostics)).toEqual(expectedDiagnostics);
      expect(
        serialized.diagnostics.every((diagnostic) => diagnostic.kind === 'serialization-policy'),
      ).toBe(true);
    });
  }
});
