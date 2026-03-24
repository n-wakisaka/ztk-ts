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
name: future
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
    expect(model.unknownSections.map((section) => section.tag?.name)).toEqual(['roki::contact']);
    expect(model.diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      'unresolved-reference',
      'unresolved-reference',
      'unresolved-reference',
      'unresolved-reference',
      'unresolved-reference',
    ]);
  });

  test('resolves transform precedence for frame, pos/att, and procedural forms', () => {
    const model = resolveZtk(
      parseZtk(`
[roki::link]
name: frame-link
frame: {
 1, 0, 0, 1
 0, 1, 0, 2
 0, 0, 1, 3
}
pos: { 9, 9, 9 }

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
rot: z 90
`),
    );

    expect(model.links[0].transform.resolved.mode).toBe('frame');
    expect(model.links[0].transform.resolved.pos).toEqual([1, 2, 3]);
    expect(model.links[0].transform.resolved.att).toEqual([1, 0, 0, 0, 1, 0, 0, 0, 1]);

    expect(model.links[1].transform.resolved.mode).toBe('pos_att');
    expect(model.links[1].transform.resolved.frame).toEqual([0, -1, 0, 1, 1, 0, 0, 2, 0, 0, 1, 3]);

    expect(model.links[2].transform.resolved.mode).toBe('procedural');
    expect(model.links[2].transform.resolved.frame).toEqual([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0]);

    expect(model.diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      'conflicting-transform',
      'unsupported-transform',
    ]);
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
});
