import { describe, expect, test } from 'vitest';
import { parseZtk, serializeZtk, serializeZtkNormalized } from '../src/index.js';

describe('serializeZtk', () => {
  test('round trips supported input with comments and blank lines', () => {
    const input = `% comment
[roki::chain]
name : arm

[roki::link]
frame: {
 1, 0, 0, 0
 0, 1, 0, 0
 0, 0, 1, 0
}
`;

    const document = parseZtk(input);

    expect(serializeZtk(document)).toBe(input.trimEnd());
  });

  test('normalizes tag and key formatting', () => {
    const input = `
  [roki::chain]  
 name : arm
`;

    const document = parseZtk(input);

    expect(serializeZtkNormalized(document)).toBe(`[roki::chain]
name: arm`);
  });
});
