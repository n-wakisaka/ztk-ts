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
name: future
kind: soft
`);
    const semantic = resolveZtk(source);
    const text = serializeZtkNormalized(semanticToAst(semantic));
    const reparsed = resolveZtk(parseZtk(text));

    expect(text).toContain('[roki::chain::init]');
    expect(text).toContain('joint: root 0 1 2');
    expect(text).toContain('[roki::contact]');
    expect(reparsed.chainInit?.jointStates.map((jointState) => jointState.linkName)).toEqual([
      'root',
      undefined,
    ]);
    expect(reparsed.chainInit?.unknownKeys.map((node) => node.key)).toEqual(['note']);
    expect(reparsed.links[0].unknownKeys.map((node) => node.key)).toEqual(['hint']);
    expect(reparsed.unknownSections.map((section) => section.tag?.name)).toEqual(['roki::contact']);
  });
});
