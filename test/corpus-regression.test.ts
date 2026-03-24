import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { parseZtk, resolveZtk, semanticToAst, serializeZtkNormalized } from '../src/index.js';

type CorpusCase = {
  name: string;
  path: URL;
  verify(model: ReturnType<typeof resolveZtk>): void;
};

function fixturePath(relativePath: string): URL {
  return new URL(`./fixtures/corpus/${relativePath}`, import.meta.url);
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
      expect(upperarm?.geometry).toEqual(
        expect.objectContaining({
          type: 'polyhedron',
          proceduralLoops: [
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
              '0.20',
              '0.03',
              'arc',
              'cw',
              '0.03',
              '12',
              '0.20',
              '-0.03',
              '0.05',
              '-0.06',
            ],
          ],
          prisms: [[0, 0, 0.04]],
        }),
      );
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
  }
});
