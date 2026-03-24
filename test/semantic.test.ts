import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import type { ZtkShapeGeometry } from '../src/index.js';
import { parseZtk, resolveZtk } from '../src/index.js';

function isPolyhedronGeometry(
  geometry: ZtkShapeGeometry,
): geometry is Extract<ZtkShapeGeometry, { type: 'polyhedron' }> {
  return 'vertices' in geometry && 'faces' in geometry;
}

function isCylinderGeometry(
  geometry: ZtkShapeGeometry,
): geometry is Extract<ZtkShapeGeometry, { type: 'cylinder' }> {
  return 'centers' in geometry;
}

function expectNumbersCloseTo(actual: number[], expected: number[]): void {
  expect(actual).toHaveLength(expected.length);
  actual.forEach((value, index) => {
    expect(value).toBeCloseTo(expected[index]);
  });
}

describe('resolveZtk', () => {
  test('resolves semantic model for the arm sample', () => {
    const source = readFileSync(new URL('./fixtures/arm_2dof.ztk', import.meta.url), 'utf8');
    const model = resolveZtk(parseZtk(source));

    expect(model.diagnostics).toEqual([]);
    expect(model.chain?.name).toBe('2DOF_arm');
    expect(model.motors).toHaveLength(1);
    expect(model.optics).toHaveLength(4);
    expect(model.shapes).toHaveLength(5);
    expect(model.links).toHaveLength(3);

    expect(model.motors[0].name).toBe('motor1');
    expect(model.motors[0].type).toBe('dc');
    expect(model.motors[0].gearRatio).toBe(120);

    const baseLink = model.links[0];
    const link1 = model.links[1];
    const link2 = model.links[2];

    expect(baseLink.name).toBe('link#00');
    expect(baseLink.jointType).toBe('fixed');
    expect(baseLink.joint.baseType).toBe('fixed');
    expect(baseLink.joint.dof).toBe(0);
    expect(baseLink.joint.isActive).toBe(false);
    expect(baseLink.massProperties.mass).toBe(1.5);
    expect(baseLink.massProperties.com).toEqual([0.067, 0, 0]);
    expect(baseLink.transform.frame).toEqual([0, 0, -1, 0, 0, 1, 0, 0, 1, 0, 0, 0]);
    expect(baseLink.shapes.map((shape) => shape.name)).toEqual(['shape_base', 'shape_motor_base']);

    expect(link1.parent).toBe(baseLink);
    expect(link1.motor).toBe(model.motors[0]);
    expect(link1.joint.motor).toBe(model.motors[0]);
    expect(link1.joint.baseType).toBe('revolute');
    expect(link1.joint.dof).toBe(1);
    expect(link1.joint.isActive).toBe(true);
    expect(link1.children).toEqual([link2]);
    expect(link1.shapes.map((shape) => shape.name)).toEqual(['shape#02', 'shape_motor']);

    expect(link2.parent).toBe(link1);
    expect(link2.motor).toBe(model.motors[0]);
    expect(link2.shapes.map((shape) => shape.name)).toEqual(['shape#01']);

    const baseShape = model.shapes[0];
    expect(baseShape.optic?.name).toBe('gray');
    expect(baseShape.geometry.type).toBe('polyhedron');
    if (isPolyhedronGeometry(baseShape.geometry)) {
      expect(baseShape.geometry.vertices[0]).toEqual([0, 0.1, 0.1, 0.1]);
      expect(baseShape.geometry.faces[0]).toEqual([0, 1, 2]);
    }

    const motorBaseShape = model.shapes[3];
    expect(motorBaseShape.geometry.type).toBe('cylinder');
    if (isCylinderGeometry(motorBaseShape.geometry)) {
      expect(motorBaseShape.geometry.centers).toEqual([
        [0.15, 0, -0.05],
        [0.15, 0, 0.05],
      ]);
      expect(motorBaseShape.geometry.radius).toBe(0.05);
    }
  });

  test('marks resolver diagnostics as validation diagnostics', () => {
    const model = resolveZtk(
      parseZtk(`
[zeo::texture]
name: tex0
`),
    );

    expect(model.diagnostics.map((diagnostic) => diagnostic.kind)).toEqual(['validation']);
    expect(model.diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      'missing-required-key',
    ]);
  });

  test('keeps unknown keys and reports unresolved references', () => {
    const model = resolveZtk(
      parseZtk(`
[roki::chain]
name: demo

[roki::link]
name: init-link
jointtype: fixed

[roki::chain::init]
pos: { 1, 2, 3 }
joint: 0
joint: init-link 10 20
joint: missing-link 30
extra: keep

[zeo::shape]
name: shape#00
type: sphere
optic: missing-optic
radius: 1
note: keep

[roki::link]
name: link#00
jointtype: revolute passive
shape: shape#00
shape: missing-shape
motor: missing-motor
parent: missing-parent
unknown: keep

[roki::contact]
bind: metal rubber
staticfriction: 0.7
kineticfriction: 0.4
elasticity: 1200
viscosity: 12
`),
    );

    expect(model.chainInit?.transform.pos).toEqual([1, 2, 3]);
    expect(model.chainInit?.joints).toEqual([[0], [10, 20], [30]]);
    expect(model.chainInit?.jointStates.map((jointState) => jointState.linkName)).toEqual([
      undefined,
      'init-link',
      'missing-link',
    ]);
    expect(model.chainInit?.jointStates[1].link).toBe(model.links[0]);
    expect(model.chainInit?.unknownKeys.map((node) => node.key)).toEqual(['extra']);
    expect(model.shapes[0].unknownKeys.map((node) => node.key)).toEqual(['note']);
    expect(model.links[1].jointType).toBe('revolute passive');
    expect(model.links[1].joint.baseType).toBe('revolute');
    expect(model.links[1].joint.modifiers).toEqual(['passive']);
    expect(model.links[1].joint.dof).toBe(1);
    expect(model.links[1].joint.isActive).toBe(false);
    expect(model.links[1].unknownKeys.map((node) => node.key)).toEqual(['unknown']);
    expect(model.contacts).toEqual([
      {
        tag: 'roki::contact',
        section: expect.any(Object),
        bind: ['metal', 'rubber'],
        staticFriction: 0.7,
        kineticFriction: 0.4,
        compensation: undefined,
        relaxation: undefined,
        elasticity: 1200,
        viscosity: 12,
        contactType: 'elastic',
        unknownKeys: [],
      },
    ]);
    expect(model.unknownSections).toEqual([]);
    expect(model.diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      'unresolved-reference',
      'unresolved-reference',
      'unresolved-reference',
      'unresolved-reference',
      'unresolved-reference',
    ]);
  });

  test('accepts named chain init keys and viscosity aliases from roki corpus forms', () => {
    const model = resolveZtk(
      parseZtk(`
[roki::link]
name: base
jointtype: fixed

[roki::link]
name: arm
jointtype: revolute
viscos: 0
parent: base

[roki::chain::init]
arm: 1.5 0 0
note: keep
`),
    );

    expect(model.diagnostics).toEqual([]);
    expect(model.links[1].viscosity).toBe(0);
    expect(model.chainInit?.jointStates).toEqual([
      {
        linkName: 'arm',
        values: [1.5, 0, 0],
        link: model.links[1],
      },
    ]);
    expect(model.chainInit?.unknownKeys.map((node) => node.key)).toEqual(['note']);
  });

  test('resolves transforms in source order including rot and DH forms', () => {
    const model = resolveZtk(
      parseZtk(`
[roki::link]
name: frame-link
rot: 0 0 1 90
frame: {
 1, 0, 0, 1
 0, 1, 0, 2
 0, 0, 1, 3
}
rot: 0 1 0 90

[roki::link]
name: pos-att-link
pos: { 1, 2, 3 }
att: {
 0, -1, 0
 1, 0, 0
 0, 0, 1
}

[roki::link]
name: dh-link
DH: { 1, 2, 3, 4 }

[roki::link]
name: rot-link
pos: { 1, 2, 3 }
rot: 0 0 1 90
`),
    );

    expect(model.links[0].transform.resolved.mode).toBe('frame');
    expect(model.links[0].transform.resolved.pos).toEqual([1, 2, 3]);
    expectNumbersCloseTo(model.links[0].transform.resolved.att, [0, 0, 1, 0, 1, 0, -1, 0, 0]);

    expect(model.links[1].transform.resolved.mode).toBe('pos_att');
    expect(model.links[1].transform.resolved.frame).toEqual([0, -1, 0, 1, 1, 0, 0, 2, 0, 0, 1, 3]);

    expect(model.links[2].transform.resolved.mode).toBe('frame');
    expect(model.links[2].transform.resolved.pos).toEqual([1, -3 * Math.sin(2), 3 * Math.cos(2)]);
    expect(model.links[2].transform.resolved.att).toEqual([
      Math.cos(4),
      -Math.sin(4),
      0,
      Math.cos(2) * Math.sin(4),
      Math.cos(2) * Math.cos(4),
      -Math.sin(2),
      Math.sin(2) * Math.sin(4),
      Math.sin(2) * Math.cos(4),
      Math.cos(2),
    ]);

    expect(model.links[3].transform.resolved.mode).toBe('pos_att');
    expectNumbersCloseTo(
      model.links[3].transform.resolved.frame,
      [0, -1, 0, 1, 1, 0, 0, 2, 0, 0, 1, 3],
    );

    expect(model.diagnostics).toEqual([]);
  });

  test('diagnoses unknown joint types while preserving raw joint data', () => {
    const model = resolveZtk(
      parseZtk(`
[roki::link]
name: strange-link
jointtype: mystery passive
min: -1
max: 1
`),
    );

    expect(model.links[0].joint.rawType).toBe('mystery passive');
    expect(model.links[0].joint.baseType).toBe('mystery');
    expect(model.links[0].joint.modifiers).toEqual(['passive']);
    expect(model.links[0].joint.dof).toBeUndefined();
    expect(model.links[0].joint.isActive).toBe(false);
    expect(model.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(['unknown-jointtype']);
  });

  test('preserves auto mass properties and resolves wider joint coverage from corpus-like input', () => {
    const model = resolveZtk(
      parseZtk(`
[roki::link]
name: base
jointtype: fixed

[roki::link]
name: ball
jointtype: spherical
COM: auto
inertia: auto
parent: base

[roki::link]
name: wall
jointtype: breakablefloat
break: 200 150
forcethreshold: 200
torquethreshold: 150
dis: 1 2 3 4 5 6
parent: ball
`),
    );

    expect(model.diagnostics).toEqual([]);
    expect(model.links.map((link) => link.joint.baseType)).toEqual([
      'fixed',
      'spherical',
      'breakablefloat',
    ]);
    expect(model.links.map((link) => link.joint.dof)).toEqual([0, 3, 6]);
    expect(model.links[1].massProperties.com).toBe('auto');
    expect(model.links[1].massProperties.inertia).toBe('auto');
    expect(model.links[2].breakValues).toEqual([200, 150]);
    expect(model.links[2].joint.breakThresholds).toEqual([200, 150]);
    expect(model.links[2].joint.forceThreshold).toBe(200);
    expect(model.links[2].joint.torqueThreshold).toBe(150);
    expect(model.links[2].joint.displacement).toEqual([1, 2, 3, 4, 5, 6]);
  });

  test('parses extended shape families used in zeo samples', () => {
    const model = resolveZtk(
      parseZtk(`
[zeo::shape]
name: ellipsoid-shape
type: ellipsoid
center: 0 0 0
ax: auto
ay: 0 1 0
az: 0 0 1
rx: 0.18
ry: 0.3
rz: 0.15
div: 16

[zeo::shape]
name: ecyl-shape
type: ellipticcylinder
center: 0 0.1 -0.3
center: 0 0.1 0.3
radius: 0.1
radius: 0.2
ref: 1 1 0
div: 24

[zeo::shape]
name: nurbs-shape
type: nurbs
dim: 3 3
uknot: 9 0 0 0 0 1 2 2 2 2
vknot: 9 0 0 0 0 1 2 2 2 2
size: 5 5
slice: 30 30
cp: 0 0 1 1 -2 0
cp: 4 4 1 7 2 0
`),
    );

    expect(model.diagnostics).toEqual([]);
    expect(model.shapes).toHaveLength(3);

    expect(model.shapes[0].geometry).toEqual({
      type: 'ellipsoid',
      center: [0, 0, 0],
      ax: 'auto',
      ay: [0, 1, 0],
      az: [0, 0, 1],
      rx: 0.18,
      ry: 0.3,
      rz: 0.15,
      div: 16,
    });
    expect(model.shapes[1].geometry).toEqual({
      type: 'ellipticcylinder',
      centers: [
        [0, 0.1, -0.3],
        [0, 0.1, 0.3],
      ],
      radii: [0.1, 0.2],
      ref: [1, 1, 0],
      div: 24,
    });
    expect(model.shapes[2].geometry).toEqual({
      type: 'nurbs',
      dim: [3, 3],
      uKnots: [[9, 0, 0, 0, 0, 1, 2, 2, 2, 2]],
      vKnots: [[9, 0, 0, 0, 0, 1, 2, 2, 2, 2]],
      sizes: [[5, 5]],
      controlPoints: [
        [0, 0, 1, 1, -2, 0],
        [4, 4, 1, 7, 2, 0],
      ],
      slices: [[30, 30]],
    });
    expect(model.shapes[2].unknownKeys).toEqual([]);
  });

  test('preserves procedural polyhedron loops from zeo syntax', () => {
    const model = resolveZtk(
      parseZtk(`
[zeo::shape]
name: upperarm
type: polyhedron
loop: z 0.02
 -0.05 -0.06
 arc cw 0.08 24
 -0.05 0.06
prism: 0 0 0.04
`),
    );

    expect(model.diagnostics).toEqual([]);
    expect(model.shapes[0].geometry).toEqual({
      type: 'polyhedron',
      vertices: [],
      faces: [],
      loops: [],
      proceduralLoops: [
        ['z', '0.02', '-0.05', '-0.06', 'arc', 'cw', '0.08', '24', '-0.05', '0.06'],
      ],
      prisms: [[0, 0, 0.04]],
      pyramids: [],
    });
  });

  test('resolves mirrored shape references and ignores trailing inline comments', () => {
    const model = resolveZtk(
      parseZtk(`
[zeo::optic]
name: cyan

[zeo::shape]
name: cone
type: cone
optic: cyan
center: 0 0 0
vert: 0 0 1
radius: 0.08

[zeo::shape]
name: cone2
optic: cyan % this will be ignored
mirror: cone y % this too
`),
    );

    expect(model.diagnostics).toEqual([]);
    expect(model.shapes[1].opticName).toBe('cyan');
    expect(model.shapes[1].mirrorName).toBe('cone');
    expect(model.shapes[1].mirrorAxis).toBe('y');
    expect(model.shapes[1].mirror).toBe(model.shapes[0]);
  });

  test('parses texture, texture references, import scale, and terra maps', () => {
    const model = resolveZtk(
      parseZtk(`
[zeo::texture]
name: tex0
file: checker.png
type: bump
depth: 0.03
coord: 0 0 0
coord: 1 1 0
coord: 2 0 1
face: 0 1 2
note: keep

[zeo::shape]
name: imported
texture: tex0
import: mesh.stl 1.5

[zeo::map]
name: terrain
type: terra
origin: 1 2
resolution: 0.5 0.25
size: 3 4
zrange: -1 2
th_var: 0.2
th_grd: 35
th_res: 0.1
grid: 0 1 1.5 0 0 1 0.03 1
hint: keep
`),
    );

    expect(model.diagnostics).toEqual([]);
    expect(model.textures).toEqual([
      {
        tag: 'zeo::texture',
        section: expect.any(Object),
        name: 'tex0',
        file: 'checker.png',
        type: 'bump',
        depth: 0.03,
        coords: [
          { index: 0, uv: [0, 0] },
          { index: 1, uv: [1, 0] },
          { index: 2, uv: [0, 1] },
        ],
        faces: [{ indices: [0, 1, 2] }],
        unknownKeys: [expect.objectContaining({ key: 'note' })],
      },
    ]);
    expect(model.shapes[0].textureName).toBe('tex0');
    expect(model.shapes[0].texture).toBe(model.textures[0]);
    expect(model.shapes[0].importName).toBe('mesh.stl');
    expect(model.shapes[0].importScale).toBe(1.5);
    expect(model.maps[0]).toEqual({
      tag: 'zeo::map',
      section: expect.any(Object),
      name: 'terrain',
      type: 'terra',
      terra: {
        origin: [1, 2],
        resolution: [0.5, 0.25],
        size: [3, 4],
        zrange: [-1, 2],
        thVar: 0.2,
        thGrid: 35,
        thRes: 0.1,
        grids: [
          {
            index: [0, 1],
            z: 1.5,
            normal: [0, 0, 1],
            variance: 0.03,
            traversable: true,
          },
        ],
      },
      unknownKeys: [expect.objectContaining({ key: 'hint' })],
    });
  });

  test('parses chain ik joints and structured constraints', () => {
    const model = resolveZtk(
      parseZtk(`
[roki::link]
name: base
jointtype: fixed

[roki::link]
name: arm
jointtype: revolute
parent: base

[roki::link]
name: tip
jointtype: revolute
parent: arm

[roki::chain::ik]
joint: all 0.5
joint: tip 1.5 0.25
constraint: 10 reach world_pos tip at 1 2 3 w 4 5 6
constraint: 20 closure l2l_att arm tip w 1 1 1
constraint: 30 momentum angular_momentum_about_com w 0.1 0.2 0.3
note: keep
`),
    );

    expect(model.diagnostics).toEqual([]);
    expect(model.chainIk?.joints).toEqual([
      { selector: 'all', weight: 0.5, values: [] },
      { selector: 'tip', weight: 1.5, values: [0.25], link: model.links[2] },
    ]);
    expect(model.chainIk?.constraints).toEqual([
      {
        priority: 10,
        name: 'reach',
        type: 'world_pos',
        tokens: ['tip', 'at', '1', '2', '3', 'w', '4', '5', '6'],
        linkNames: ['tip'],
        links: [model.links[2]],
        attentionPoint: [1, 2, 3],
        weight: [4, 5, 6],
        unknownTokens: [],
      },
      {
        priority: 20,
        name: 'closure',
        type: 'l2l_att',
        tokens: ['arm', 'tip', 'w', '1', '1', '1'],
        linkNames: ['arm', 'tip'],
        links: [model.links[1], model.links[2]],
        weight: [1, 1, 1],
        unknownTokens: [],
      },
      {
        priority: 30,
        name: 'momentum',
        type: 'angular_momentum_about_com',
        tokens: ['w', '0.1', '0.2', '0.3'],
        linkNames: [],
        links: [],
        weight: [0.1, 0.2, 0.3],
        unknownTokens: [],
      },
    ]);
    expect(model.chainIk?.unknownKeys.map((node) => node.key)).toEqual(['note']);
  });

  test('parses contacts and keeps the last rigid/elastic group active', () => {
    const model = resolveZtk(
      parseZtk(`
[roki::contact]
bind: rubber steel
staticfriction: 0.8
kineticfriction: 0.6
compensation: 100
relaxation: 0.3
elasticity: 500
viscosity: 5
note: keep

[roki::contact]
bind: foam glass
elasticity: 200
viscosity: 3
compensation: 50
`),
    );

    expect(model.diagnostics).toEqual([]);
    expect(model.contacts).toEqual([
      {
        tag: 'roki::contact',
        section: expect.any(Object),
        bind: ['rubber', 'steel'],
        staticFriction: 0.8,
        kineticFriction: 0.6,
        compensation: 100,
        relaxation: 0.3,
        elasticity: 500,
        viscosity: 5,
        contactType: 'elastic',
        unknownKeys: [expect.objectContaining({ key: 'note' })],
      },
      {
        tag: 'roki::contact',
        section: expect.any(Object),
        bind: ['foam', 'glass'],
        staticFriction: undefined,
        kineticFriction: undefined,
        compensation: 50,
        relaxation: undefined,
        elasticity: 200,
        viscosity: 3,
        contactType: 'rigid',
        unknownKeys: [],
      },
    ]);
  });

  test('emits validation diagnostics for missing texture coords and repeated known keys', () => {
    const model = resolveZtk(
      parseZtk(`
[zeo::texture]
name: tex0
name: tex1
file: checker.png
depth: 0.1
depth: 0.2

[roki::contact]
bind: rubber steel
compensation: 100

[roki::contact]
bind: steel rubber
elasticity: 500
`),
    );

    expect(model.textures[0].name).toBe('tex0');
    expect(model.textures[0].depth).toBe(0.1);
    expect(model.textures[0].unknownKeys).toEqual([]);
    expect(model.contacts).toHaveLength(2);
    expect(model.diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      'repeated-key-overflow',
      'repeated-key-overflow',
      'missing-required-key',
      'duplicate-contact-bind',
    ]);
  });
});
