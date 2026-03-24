import { describe, expect, test } from 'vitest';
import { getSections, parseZtk } from '../src/index.js';

describe('parseZtk', () => {
  test('parses tags and repeated keys in order', () => {
    const document = parseZtk(`
[roki::chain]
name: arm

[roki::link]
name: link#00
shape: base
shape: cover
`);

    const sections = getSections(document);

    expect(sections).toHaveLength(2);
    expect(sections[0].tag?.name).toBe('roki::chain');
    expect(sections[0].nodes.map((node) => node.key)).toEqual(['name']);
    expect(sections[1].tag?.name).toBe('roki::link');
    expect(sections[1].nodes.map((node) => node.key)).toEqual(['name', 'shape', 'shape']);
    expect(sections[1].nodes[2].values).toEqual(['cover']);
  });

  test('parses multi line values used by matrices', () => {
    const document = parseZtk(`
[roki::link]
inertia: {
 1, 0, 0
 0, 2, 0
 0, 0, 3
}
`);

    const section = getSections(document)[0];
    const inertia = section.nodes[0];

    expect(inertia.key).toBe('inertia');
    expect(inertia.values).toEqual(['1', '0', '0', '0', '2', '0', '0', '0', '3']);
    expect(inertia.rawLines).toHaveLength(5);
  });

  test('parses indented continuation lines used by polyhedron loops', () => {
    const document = parseZtk(`
[zeo::shape]
loop: z 0.02
 -0.05 -0.06
 arc cw 0.08 24
 -0.05 0.06
prism: 0 0 0.04
`);

    const section = getSections(document)[0];
    const loop = section.nodes[0];

    expect(loop.key).toBe('loop');
    expect(loop.values).toEqual([
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
    ]);
    expect(loop.rawLines).toHaveLength(4);
    expect(section.nodes[1].key).toBe('prism');
  });

  test('strips inline percent comments from values', () => {
    const document = parseZtk(`
[zeo::shape]
optic: cyan % ignored
mirror: cone y % ignored
`);

    const section = getSections(document)[0];
    expect(section.nodes[0].values).toEqual(['cyan']);
    expect(section.nodes[1].values).toEqual(['cone', 'y']);
  });
});
