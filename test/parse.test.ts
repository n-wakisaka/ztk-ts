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
});
