import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { parseZtk, resolveZtk, semanticToAst, serializeZtkNormalized } from '../src/index.js';

describe('semanticToAst', () => {
  test('round-trips the semantic model for the arm sample', () => {
    const source = readFileSync(new URL('./fixtures/arm_2dof.ztk', import.meta.url), 'utf8');
    const original = resolveZtk(parseZtk(source));
    const regenerated = resolveZtk(parseZtk(serializeZtkNormalized(semanticToAst(original))));

    expect(regenerated.diagnostics).toEqual([]);
    expect(regenerated.chain?.name).toBe(original.chain?.name);
    expect(regenerated.optics.map((optic) => optic.name)).toEqual(
      original.optics.map((optic) => optic.name),
    );
    expect(regenerated.shapes.map((shape) => shape.name)).toEqual(
      original.shapes.map((shape) => shape.name),
    );
    expect(regenerated.links.map((link) => link.name)).toEqual(
      original.links.map((link) => link.name),
    );
    expect(regenerated.links.map((link) => link.jointType)).toEqual(
      original.links.map((link) => link.jointType),
    );
    expect(regenerated.links.map((link) => link.parentName)).toEqual(
      original.links.map((link) => link.parentName),
    );
    expect(regenerated.links.map((link) => link.shapeNames)).toEqual(
      original.links.map((link) => link.shapeNames),
    );
  });

  test('preserves chain init names, unknown keys, and unknown sections in normalized output', () => {
    const source = parseZtk(`
[roki::chain]
name: demo

[roki::link]
name: root
jointtype: fixed
hint: keep

[roki::chain::init]
joint: root 0 1 2
joint: 3 4
note: keep

[roki::contact]
bind: metal rubber
compensation: 100
relaxation: 0.2
`);
    const semantic = resolveZtk(source);
    const text = serializeZtkNormalized(semanticToAst(semantic));
    const reparsed = resolveZtk(parseZtk(text));

    expect(text).toContain('[roki::chain::init]');
    expect(text).toContain('joint: root 0 1 2');
    expect(text).toContain('[roki::contact]');
    expect(text).toContain('bind: metal rubber');
    expect(reparsed.chainInit?.jointStates.map((jointState) => jointState.linkName)).toEqual([
      'root',
      undefined,
    ]);
    expect(reparsed.chainInit?.unknownKeys.map((node) => node.key)).toEqual(['note']);
    expect(reparsed.links[0].unknownKeys.map((node) => node.key)).toEqual(['hint']);
    expect(reparsed.contacts).toEqual([
      {
        tag: 'roki::contact',
        section: expect.any(Object),
        bind: ['metal', 'rubber'],
        staticFriction: undefined,
        kineticFriction: undefined,
        compensation: 100,
        relaxation: 0.2,
        elasticity: undefined,
        viscosity: undefined,
        contactType: 'rigid',
        unknownKeys: [],
      },
    ]);
    expect(reparsed.unknownSections).toEqual([]);
  });

  test('normalizes named chain init keys and viscosity aliases', () => {
    const semantic = resolveZtk(
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
`),
    );

    const text = serializeZtkNormalized(semanticToAst(semantic));
    const reparsed = resolveZtk(parseZtk(text));

    expect(text).toContain('viscosity: 0');
    expect(text).toContain('joint: arm 1.5 0 0');
    expect(reparsed.links[1].viscosity).toBe(0);
    expect(reparsed.chainInit?.jointStates.map((jointState) => jointState.linkName)).toEqual([
      'arm',
    ]);
    expect(reparsed.chainInit?.unknownKeys).toEqual([]);
  });

  test('round-trips auto mass properties and extended shape families', () => {
    const semantic = resolveZtk(
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

[zeo::shape]
name: ecyl-shape
type: ellipticcylinder
center: 0 0.1 -0.3
center: 0 0.1 0.3
radius: 0.1
radius: 0.2
ref: 1 1 0

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

[roki::link]
name: ball
jointtype: spherical
COM: auto
inertia: auto
shape: ellipsoid-shape

[roki::link]
name: wall
jointtype: breakablefloat
parent: ball
shape: ecyl-shape
shape: nurbs-shape
break: 200 150
forcethreshold: 200
torquethreshold: 150
dis: 1 2 3 4 5 6
`),
    );

    const text = serializeZtkNormalized(semanticToAst(semantic));
    const reparsed = resolveZtk(parseZtk(text));

    expect(text).toContain('COM: auto');
    expect(text).toContain('inertia: auto');
    expect(text).toContain('type: ellipsoid');
    expect(text).toContain('type: ellipticcylinder');
    expect(text).toContain('type: nurbs');
    expect(text).toContain('dim: 3 3');
    expect(text).toContain('break: 200 150');
    expect(reparsed.links[0].massProperties.com).toBe('auto');
    expect(reparsed.links[0].massProperties.inertia).toBe('auto');
    expect(reparsed.links[1].breakValues).toEqual([200, 150]);
    expect(reparsed.links.map((link) => link.joint.baseType)).toEqual([
      'spherical',
      'breakablefloat',
    ]);
    expect(reparsed.shapes.map((shape) => shape.geometry)).toEqual([
      expect.objectContaining({ type: 'ellipsoid' }),
      expect.objectContaining({ type: 'ellipticcylinder' }),
      expect.objectContaining({ type: 'nurbs', dim: [3, 3] }),
    ]);
  });

  test('round-trips procedural polyhedron loops in normalized output', () => {
    const semantic = resolveZtk(
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

    const text = serializeZtkNormalized(semanticToAst(semantic));
    const reparsed = resolveZtk(parseZtk(text));

    expect(text).toContain('loop: z 0.02 -0.05 -0.06 arc cw 0.08 24 -0.05 0.06');
    expect(reparsed.shapes[0].geometry).toEqual(
      expect.objectContaining({
        type: 'polyhedron',
        proceduralLoops: [
          ['z', '0.02', '-0.05', '-0.06', 'arc', 'cw', '0.08', '24', '-0.05', '0.06'],
        ],
        prisms: [[0, 0, 0.04]],
      }),
    );
  });

  test('round-trips mirror references with axis', () => {
    const semantic = resolveZtk(
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
mirror: cone y
optic: cyan
`),
    );

    const text = serializeZtkNormalized(semanticToAst(semantic));
    const reparsed = resolveZtk(parseZtk(text));

    expect(text).toContain('mirror: cone y');
    expect(reparsed.shapes[1].mirrorName).toBe('cone');
    expect(reparsed.shapes[1].mirrorAxis).toBe('y');
  });

  test('round-trips textures, import scale, and terra maps', () => {
    const semantic = resolveZtk(
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
`),
    );

    const text = serializeZtkNormalized(semanticToAst(semantic));
    const reparsed = resolveZtk(parseZtk(text));

    expect(text).toContain('[zeo::texture]');
    expect(text).toContain('coord: 0 0 0');
    expect(text).toContain('import: mesh.stl 1.5');
    expect(text).toContain('[zeo::map]');
    expect(reparsed.textures[0].coords).toEqual([
      { index: 0, uv: [0, 0] },
      { index: 1, uv: [1, 0] },
      { index: 2, uv: [0, 1] },
    ]);
    expect(reparsed.shapes[0].textureName).toBe('tex0');
    expect(reparsed.shapes[0].importName).toBe('mesh.stl');
    expect(reparsed.shapes[0].importScale).toBe(1.5);
    expect(reparsed.maps[0].terra?.grids).toEqual([
      {
        index: [0, 1],
        z: 1.5,
        normal: [0, 0, 1],
        variance: 0.03,
        traversable: true,
      },
    ]);
  });

  test('round-trips structured chain ik configuration', () => {
    const semantic = resolveZtk(
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
`),
    );

    const text = serializeZtkNormalized(semanticToAst(semantic));
    const reparsed = resolveZtk(parseZtk(text));

    expect(text).toContain('[roki::chain::ik]');
    expect(text).toContain('joint: all 0.5');
    expect(text).toContain('constraint: 10 reach world_pos tip at 1 2 3 w 4 5 6');
    expect(reparsed.chainIk?.joints).toEqual(semantic.chainIk?.joints);
    expect(reparsed.chainIk?.constraints).toEqual(semantic.chainIk?.constraints);
  });

  test('round-trips contact models using active rigid/elastic keys', () => {
    const semantic = resolveZtk(
      parseZtk(`
[roki::contact]
bind: rubber steel
staticfriction: 0.8
kineticfriction: 0.6
compensation: 100
relaxation: 0.3
elasticity: 500
viscosity: 5
`),
    );

    const text = serializeZtkNormalized(semanticToAst(semantic));
    const reparsed = resolveZtk(parseZtk(text));

    expect(text).toContain('[roki::contact]');
    expect(text).toContain('bind: rubber steel');
    expect(text).toContain('elasticity: 500');
    expect(text).toContain('viscosity: 5');
    expect(text).not.toContain('compensation: 100');
    expect(text).not.toContain('relaxation: 0.3');
    expect(reparsed.contacts).toEqual([
      {
        tag: 'roki::contact',
        section: expect.any(Object),
        bind: ['rubber', 'steel'],
        staticFriction: 0.8,
        kineticFriction: 0.6,
        compensation: undefined,
        relaxation: undefined,
        elasticity: 500,
        viscosity: 5,
        contactType: 'elastic',
        unknownKeys: [],
      },
    ]);
  });
});
