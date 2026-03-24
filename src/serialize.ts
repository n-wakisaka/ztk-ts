import type { ZtkDocument, ZtkNode } from './ast.js';

function serializeNode(node: ZtkNode): string {
  switch (node.type) {
    case 'blank':
      return '';
    case 'comment':
      return node.raw;
    case 'tag':
      return `[${node.name}]`;
    case 'keyValue':
      return node.rawLines.join('\n');
  }
}

function normalizeMultilineValue(value: string): string {
  const lines = value
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length <= 1) {
    return lines[0] ?? '';
  }

  return [lines[0], ...lines.slice(1).map((line) => `  ${line}`)].join('\n');
}

function normalizeNode(node: ZtkNode): string {
  switch (node.type) {
    case 'blank':
      return '';
    case 'comment':
      return node.raw.trimStart();
    case 'tag':
      return `[${node.name}]`;
    case 'keyValue': {
      const value = normalizeMultilineValue(node.rawValue);
      return value.length > 0 ? `${node.key}: ${value}` : `${node.key}:`;
    }
  }
}

export function serializeZtk(document: ZtkDocument): string {
  return document.nodes.map(serializeNode).join('\n');
}

export function serializeZtkNormalized(document: ZtkDocument): string {
  const lines = document.nodes.map(normalizeNode);

  while (lines.length > 0 && lines[0] === '') {
    lines.shift();
  }
  while (lines.length > 0 && lines[lines.length - 1] === '') {
    lines.pop();
  }

  return lines.join('\n');
}
