import { ZtkCommentNode, ZtkDocument, ZtkKeyValueNode, ZtkNode, ZtkTagNode, createDocument } from './ast.js';
import { tokenizeValue } from './tokenize.js';

function isBlankLine(line: string): boolean {
  return line.trim().length === 0;
}

function isCommentLine(line: string): boolean {
  return line.trimStart().startsWith('%');
}

function parseCommentLine(line: string): ZtkCommentNode {
  return {
    type: 'comment',
    raw: line,
    text: line.trimStart().slice(1).trim(),
  };
}

function parseTagLine(line: string): ZtkTagNode | null {
  const match = line.match(/^\s*\[([^\]]+)\]\s*$/);
  if (!match) {
    return null;
  }

  return {
    type: 'tag',
    raw: line,
    name: match[1].trim(),
  };
}

function parseKeyValueLine(line: string): { key: string; value: string } | null {
  const index = line.indexOf(':');
  if (index < 0) {
    return null;
  }

  return {
    key: line.slice(0, index).trim(),
    value: line.slice(index + 1).trim(),
  };
}

function updateDepth(line: string, depth: number): number {
  let nextDepth = depth;
  for (const char of line) {
    if (char === '{' || char === '(') {
      nextDepth += 1;
    } else if (char === '}' || char === ')') {
      nextDepth -= 1;
    }
  }
  return nextDepth;
}

function parseKeyValueNode(lines: string[], start: number): { node: ZtkKeyValueNode; nextIndex: number } | null {
  const firstLine = parseKeyValueLine(lines[start]);
  if (!firstLine) {
    return null;
  }

  const rawLines = [lines[start]];
  const valueLines = [firstLine.value];
  let depth = updateDepth(firstLine.value, 0);
  let index = start;

  while (depth > 0 && index + 1 < lines.length) {
    index += 1;
    rawLines.push(lines[index]);
    valueLines.push(lines[index].trim());
    depth = updateDepth(lines[index], depth);
  }

  return {
    node: {
      type: 'keyValue',
      rawLines,
      key: firstLine.key,
      rawValue: valueLines.join('\n'),
      values: tokenizeValue(valueLines.join('\n')),
    },
    nextIndex: index + 1,
  };
}

export function parseZtk(data: string): ZtkDocument {
  const normalized = data.replace(/\r\n/g, '\n');
  const lines = normalized.split('\n');
  const nodes: ZtkNode[] = [];

  let index = 0;
  while (index < lines.length) {
    const line = lines[index];

    if (index === lines.length - 1 && line === '') {
      break;
    }

    if (isBlankLine(line)) {
      nodes.push({ type: 'blank', raw: line });
      index += 1;
      continue;
    }

    if (isCommentLine(line)) {
      nodes.push(parseCommentLine(line));
      index += 1;
      continue;
    }

    const tag = parseTagLine(line);
    if (tag) {
      nodes.push(tag);
      index += 1;
      continue;
    }

    const keyValue = parseKeyValueNode(lines, index);
    if (keyValue) {
      nodes.push(keyValue.node);
      index = keyValue.nextIndex;
      continue;
    }

    nodes.push({
      type: 'comment',
      raw: line,
      text: `UNPARSED ${line}`,
    });
    index += 1;
  }

  return createDocument(nodes);
}
