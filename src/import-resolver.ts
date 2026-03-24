import {
  type NodeBufferLike,
  readNodeFileBufferSync,
  readNodeFileTextSync,
} from './node-file-access.js';
import type { ZtkShape, ZtkShapeGeometry } from './semantic.js';
import type { ZtkImportedShapeResolution, ZtkImportedShapeSource } from './semantic-serialize.js';

function parseObjFaceVertexIndex(token: string): number | undefined {
  const vertexToken = token.split('/', 1)[0];
  if (!vertexToken) {
    return undefined;
  }

  const index = Number.parseInt(vertexToken, 10);
  if (!Number.isFinite(index) || index <= 0) {
    return undefined;
  }

  return index - 1;
}

function parseObjImportedGeometry(source: ZtkImportedShapeSource): ZtkImportedShapeResolution {
  const textResult = readNodeFileTextSync(source.importName);
  if (!textResult.ok) {
    return {
      kind: 'failed',
      code:
        textResult.code === 'filesystem-unavailable'
          ? 'unsupported-import-resolution'
          : 'import-resolution-failed',
      message:
        textResult.code === 'filesystem-unavailable'
          ? textResult.message
          : `Failed to read imported ".obj" shape "${source.importName}": ${textResult.message}`,
    };
  }
  const text = textResult.value;

  const vertices: number[][] = [];
  const faces: number[][] = [];

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    if (line.startsWith('v ')) {
      const tokens = line.slice(2).trim().split(/\s+/);
      if (tokens.length < 3) {
        return {
          kind: 'failed',
          code: 'import-resolution-failed',
          message: `Imported ".obj" shape "${source.importName}" contains an invalid vertex record`,
        };
      }

      const vertex = tokens.slice(0, 3).map((token) => Number(token));
      if (vertex.some((value) => !Number.isFinite(value))) {
        return {
          kind: 'failed',
          code: 'import-resolution-failed',
          message: `Imported ".obj" shape "${source.importName}" contains a non-numeric vertex`,
        };
      }

      vertices.push(vertex);
      continue;
    }

    if (line.startsWith('f ')) {
      const tokens = line.slice(2).trim().split(/\s+/);
      if (tokens.length < 3) {
        return {
          kind: 'failed',
          code: 'import-resolution-failed',
          message: `Imported ".obj" shape "${source.importName}" contains an invalid face record`,
        };
      }

      const indices = tokens
        .slice(0, 3)
        .map((token) => parseObjFaceVertexIndex(token))
        .filter((value): value is number => value !== undefined);
      if (indices.length !== 3 || indices.some((index) => index < 0 || index >= vertices.length)) {
        return {
          kind: 'failed',
          code: 'import-resolution-failed',
          message: `Imported ".obj" shape "${source.importName}" contains an out-of-range face index`,
        };
      }

      faces.push(indices);
    }
  }

  if (vertices.length === 0) {
    return {
      kind: 'failed',
      code: 'import-resolution-failed',
      message: `Imported ".obj" shape "${source.importName}" does not contain any vertices`,
    };
  }

  if (faces.length === 0) {
    return {
      kind: 'failed',
      code: 'import-resolution-failed',
      message: `Imported ".obj" shape "${source.importName}" does not contain any faces`,
    };
  }

  const geometry: ZtkShapeGeometry = {
    type: 'polyhedron',
    vertices,
    faces,
    loops: [],
    proceduralLoops: [],
    proceduralLoopDefs: [],
    prisms: [],
    pyramids: [],
  };

  return {
    kind: 'resolved',
    geometry,
  };
}

function getOrInsertVertex(
  vertices: number[][],
  vertexIds: Map<string, number>,
  vertex: [number, number, number],
): number {
  const key = `${vertex[0]}\u0000${vertex[1]}\u0000${vertex[2]}`;
  const existing = vertexIds.get(key);
  if (existing !== undefined) {
    return existing;
  }

  const index = vertices.length;
  vertices.push(vertex);
  vertexIds.set(key, index);
  return index;
}

function finalizePolyhedronGeometry(
  format: 'obj' | 'stl' | 'ply',
  source: ZtkImportedShapeSource,
  vertices: number[][],
  faces: number[][],
): ZtkImportedShapeResolution {
  if (vertices.length === 0) {
    return {
      kind: 'failed',
      code: 'import-resolution-failed',
      message: `Imported ".${format}" shape "${source.importName}" does not contain any vertices`,
    };
  }

  if (faces.length === 0) {
    return {
      kind: 'failed',
      code: 'import-resolution-failed',
      message: `Imported ".${format}" shape "${source.importName}" does not contain any faces`,
    };
  }

  const geometry: ZtkShapeGeometry = {
    type: 'polyhedron',
    vertices,
    faces,
    loops: [],
    proceduralLoops: [],
    proceduralLoopDefs: [],
    prisms: [],
    pyramids: [],
  };

  return {
    kind: 'resolved',
    geometry,
  };
}

function parseAsciiStlImportedGeometry(
  source: ZtkImportedShapeSource,
  buffer: NodeBufferLike,
): ZtkImportedShapeResolution {
  const text = buffer.toString('utf8');
  const vertices: number[][] = [];
  const vertexIds = new Map<string, number>();
  const faces: number[][] = [];
  let pendingFace: number[] = [];

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) {
      continue;
    }

    if (line.startsWith('vertex ')) {
      const tokens = line.slice(7).trim().split(/\s+/);
      if (tokens.length < 3) {
        return {
          kind: 'failed',
          code: 'import-resolution-failed',
          message: `Imported ".stl" shape "${source.importName}" contains an invalid vertex record`,
        };
      }

      const vertex = tokens.slice(0, 3).map((token) => Number(token));
      if (vertex.some((value) => !Number.isFinite(value))) {
        return {
          kind: 'failed',
          code: 'import-resolution-failed',
          message: `Imported ".stl" shape "${source.importName}" contains a non-numeric vertex`,
        };
      }

      pendingFace.push(getOrInsertVertex(vertices, vertexIds, vertex as [number, number, number]));
      continue;
    }

    if (line === 'endfacet') {
      if (pendingFace.length !== 3) {
        return {
          kind: 'failed',
          code: 'import-resolution-failed',
          message: `Imported ".stl" shape "${source.importName}" contains a non-triangle facet`,
        };
      }
      faces.push(pendingFace);
      pendingFace = [];
    }
  }

  return finalizePolyhedronGeometry('stl', source, vertices, faces);
}

function looksLikeBinaryStl(buffer: NodeBufferLike): boolean {
  if (buffer.length < 84) {
    return false;
  }

  const facetCount = buffer.readUInt32LE(80);
  return buffer.length === 84 + facetCount * 50;
}

function parseBinaryStlImportedGeometry(
  source: ZtkImportedShapeSource,
  buffer: NodeBufferLike,
): ZtkImportedShapeResolution {
  if (buffer.length < 84) {
    return {
      kind: 'failed',
      code: 'import-resolution-failed',
      message: `Imported ".stl" shape "${source.importName}" is too short to be a binary STL`,
    };
  }

  const facetCount = buffer.readUInt32LE(80);
  const expectedLength = 84 + facetCount * 50;
  if (buffer.length !== expectedLength) {
    return {
      kind: 'failed',
      code: 'import-resolution-failed',
      message: `Imported ".stl" shape "${source.importName}" has an invalid binary STL size`,
    };
  }

  const vertices: number[][] = [];
  const vertexIds = new Map<string, number>();
  const faces: number[][] = [];

  for (let facetIndex = 0; facetIndex < facetCount; facetIndex += 1) {
    const facetOffset = 84 + facetIndex * 50;
    const face: number[] = [];
    for (let vertexIndex = 0; vertexIndex < 3; vertexIndex += 1) {
      const vertexOffset = facetOffset + 12 + vertexIndex * 12;
      const vertex: [number, number, number] = [
        buffer.readFloatLE(vertexOffset),
        buffer.readFloatLE(vertexOffset + 4),
        buffer.readFloatLE(vertexOffset + 8),
      ];
      face.push(getOrInsertVertex(vertices, vertexIds, vertex));
    }
    faces.push(face);
  }

  return finalizePolyhedronGeometry('stl', source, vertices, faces);
}

function parseStlImportedGeometry(source: ZtkImportedShapeSource): ZtkImportedShapeResolution {
  const bufferResult = readNodeFileBufferSync(source.importName);
  if (!bufferResult.ok) {
    return {
      kind: 'failed',
      code:
        bufferResult.code === 'filesystem-unavailable'
          ? 'unsupported-import-resolution'
          : 'import-resolution-failed',
      message:
        bufferResult.code === 'filesystem-unavailable'
          ? bufferResult.message
          : `Failed to read imported ".stl" shape "${source.importName}": ${bufferResult.message}`,
    };
  }
  const buffer = bufferResult.value;

  if (looksLikeBinaryStl(buffer)) {
    return parseBinaryStlImportedGeometry(source, buffer);
  }

  return parseAsciiStlImportedGeometry(source, buffer);
}

type PlyFormat = 'ascii' | 'binary_little_endian' | 'binary_big_endian';
type PlyScalarType = 'char' | 'uchar' | 'short' | 'ushort' | 'int' | 'uint' | 'float' | 'double';
type PlyProperty =
  | {
      kind: 'scalar';
      type: PlyScalarType;
      name: string;
    }
  | {
      kind: 'list';
      countType: PlyScalarType;
      elementType: PlyScalarType;
      name: string;
    };
type PlyElement = {
  name: string;
  count: number;
  properties: PlyProperty[];
};

function isPlyScalarType(value: string): value is PlyScalarType {
  return (
    value === 'char' ||
    value === 'uchar' ||
    value === 'short' ||
    value === 'ushort' ||
    value === 'int' ||
    value === 'uint' ||
    value === 'float' ||
    value === 'double'
  );
}

function parsePlyHeader(
  source: ZtkImportedShapeSource,
  buffer: NodeBufferLike,
):
  | { format: PlyFormat; elements: PlyElement[]; headerLength: number }
  | ZtkImportedShapeResolution {
  const endMarker = 'end_header';
  const endIndex = buffer.indexOf(endMarker);
  if (endIndex < 0) {
    return {
      kind: 'failed',
      code: 'import-resolution-failed',
      message: `Imported ".ply" shape "${source.importName}" does not contain an end_header marker`,
    };
  }

  const headerEnd = buffer.indexOf('\n', endIndex);
  const headerLength = headerEnd >= 0 ? headerEnd + 1 : buffer.length;
  const header = buffer.toString('utf8', 0, headerLength).replace(/\r\n/g, '\n');
  const lines = header
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  if (lines[0] !== 'ply') {
    return {
      kind: 'failed',
      code: 'import-resolution-failed',
      message: `Imported ".ply" shape "${source.importName}" is missing the ply header`,
    };
  }

  let format: PlyFormat | undefined;
  const elements: PlyElement[] = [];
  let currentElement: PlyElement | undefined;

  for (const line of lines.slice(1)) {
    if (line === endMarker) {
      break;
    }

    if (line.startsWith('comment ') || line.startsWith('obj_info ')) {
      continue;
    }

    const tokens = line.split(/\s+/);
    if (tokens[0] === 'format') {
      if (
        tokens[1] === 'ascii' ||
        tokens[1] === 'binary_little_endian' ||
        tokens[1] === 'binary_big_endian'
      ) {
        format = tokens[1];
        continue;
      }

      return {
        kind: 'failed',
        code: 'import-resolution-failed',
        message: `Imported ".ply" shape "${source.importName}" uses an unsupported format "${tokens[1] ?? ''}"`,
      };
    }

    if (tokens[0] === 'element') {
      const count = Number.parseInt(tokens[2] ?? '', 10);
      if (!tokens[1] || !Number.isFinite(count) || count < 0) {
        return {
          kind: 'failed',
          code: 'import-resolution-failed',
          message: `Imported ".ply" shape "${source.importName}" contains an invalid element declaration`,
        };
      }
      currentElement = { name: tokens[1], count, properties: [] };
      elements.push(currentElement);
      continue;
    }

    if (tokens[0] === 'property') {
      if (!currentElement) {
        return {
          kind: 'failed',
          code: 'import-resolution-failed',
          message: `Imported ".ply" shape "${source.importName}" contains a property before any element`,
        };
      }
      if (tokens[1] === 'list') {
        const countType = tokens[2];
        const elementType = tokens[3];
        const name = tokens[4];
        if (
          !countType ||
          !elementType ||
          !name ||
          !isPlyScalarType(countType) ||
          !isPlyScalarType(elementType)
        ) {
          return {
            kind: 'failed',
            code: 'import-resolution-failed',
            message: `Imported ".ply" shape "${source.importName}" contains an invalid list property`,
          };
        }
        currentElement.properties.push({
          kind: 'list',
          countType,
          elementType,
          name,
        });
        continue;
      }

      const type = tokens[1];
      const name = tokens[2];
      if (!type || !name || !isPlyScalarType(type)) {
        return {
          kind: 'failed',
          code: 'import-resolution-failed',
          message: `Imported ".ply" shape "${source.importName}" contains an invalid scalar property`,
        };
      }
      currentElement.properties.push({
        kind: 'scalar',
        type,
        name,
      });
    }
  }

  if (!format) {
    return {
      kind: 'failed',
      code: 'import-resolution-failed',
      message: `Imported ".ply" shape "${source.importName}" does not declare a format`,
    };
  }

  return { format, elements, headerLength };
}

function parsePlyAsciiScalar(type: PlyScalarType, token: string): number {
  return type === 'float' || type === 'double' ? Number(token) : Number.parseInt(token, 10);
}

function readPlyBinaryScalar(
  buffer: NodeBufferLike,
  offset: number,
  type: PlyScalarType,
  littleEndian: boolean,
): { value: number; nextOffset: number } | undefined {
  try {
    switch (type) {
      case 'char':
        return { value: buffer.readInt8(offset), nextOffset: offset + 1 };
      case 'uchar':
        return { value: buffer.readUInt8(offset), nextOffset: offset + 1 };
      case 'short':
        return littleEndian
          ? { value: buffer.readInt16LE(offset), nextOffset: offset + 2 }
          : { value: buffer.readInt16BE(offset), nextOffset: offset + 2 };
      case 'ushort':
        return littleEndian
          ? { value: buffer.readUInt16LE(offset), nextOffset: offset + 2 }
          : { value: buffer.readUInt16BE(offset), nextOffset: offset + 2 };
      case 'int':
        return littleEndian
          ? { value: buffer.readInt32LE(offset), nextOffset: offset + 4 }
          : { value: buffer.readInt32BE(offset), nextOffset: offset + 4 };
      case 'uint':
        return littleEndian
          ? { value: buffer.readUInt32LE(offset), nextOffset: offset + 4 }
          : { value: buffer.readUInt32BE(offset), nextOffset: offset + 4 };
      case 'float':
        return littleEndian
          ? { value: buffer.readFloatLE(offset), nextOffset: offset + 4 }
          : { value: buffer.readFloatBE(offset), nextOffset: offset + 4 };
      case 'double':
        return littleEndian
          ? { value: buffer.readDoubleLE(offset), nextOffset: offset + 8 }
          : { value: buffer.readDoubleBE(offset), nextOffset: offset + 8 };
    }
  } catch {
    return undefined;
  }
}

function triangulatePlyFace(indices: number[]): number[][] {
  const faces: number[][] = [];
  if (indices.length < 3) {
    return faces;
  }
  const v1 = indices[0] as number;
  let v2 = indices[1] as number;
  for (let index = 2; index < indices.length; index += 1) {
    const v3 = indices[index] as number;
    faces.push([v1, v2, v3]);
    v2 = v3;
  }
  return faces;
}

function parsePlyImportedGeometry(source: ZtkImportedShapeSource): ZtkImportedShapeResolution {
  const bufferResult = readNodeFileBufferSync(source.importName);
  if (!bufferResult.ok) {
    return {
      kind: 'failed',
      code:
        bufferResult.code === 'filesystem-unavailable'
          ? 'unsupported-import-resolution'
          : 'import-resolution-failed',
      message:
        bufferResult.code === 'filesystem-unavailable'
          ? bufferResult.message
          : `Failed to read imported ".ply" shape "${source.importName}": ${bufferResult.message}`,
    };
  }
  const buffer = bufferResult.value;

  const parsedHeader = parsePlyHeader(source, buffer);
  if ('kind' in parsedHeader) {
    return parsedHeader;
  }

  const vertices: number[][] = [];
  const faces: number[][] = [];
  const vertexElement = parsedHeader.elements.find((element) => element.name === 'vertex');
  const faceElement = parsedHeader.elements.find((element) => element.name === 'face');

  if (parsedHeader.format === 'ascii') {
    const body = buffer.toString('utf8', parsedHeader.headerLength).replace(/\r\n/g, '\n');
    const lines = body.split('\n');
    let lineIndex = 0;

    for (const element of parsedHeader.elements) {
      for (let elementIndex = 0; elementIndex < element.count; elementIndex += 1) {
        const rawLine = lines[lineIndex] ?? '';
        lineIndex += 1;
        const tokens = rawLine
          .trim()
          .split(/\s+/)
          .filter((token) => token.length > 0);

        if (element.name === 'vertex') {
          const values = new Map<string, number>();
          let tokenIndex = 0;
          for (const property of element.properties) {
            if (property.kind !== 'scalar') {
              return {
                kind: 'failed',
                code: 'import-resolution-failed',
                message: `Imported ".ply" shape "${source.importName}" uses an unsupported vertex list property`,
              };
            }
            const token = tokens[tokenIndex];
            tokenIndex += 1;
            if (!token) {
              return {
                kind: 'failed',
                code: 'import-resolution-failed',
                message: `Imported ".ply" shape "${source.importName}" contains an incomplete vertex record`,
              };
            }
            const value = parsePlyAsciiScalar(property.type, token);
            if (!Number.isFinite(value)) {
              return {
                kind: 'failed',
                code: 'import-resolution-failed',
                message: `Imported ".ply" shape "${source.importName}" contains a non-numeric vertex value`,
              };
            }
            values.set(property.name, value);
          }
          vertices.push([values.get('x') ?? 0, values.get('y') ?? 0, values.get('z') ?? 0]);
          continue;
        }

        if (element.name === 'face') {
          let tokenIndex = 0;
          for (const property of element.properties) {
            if (property.kind === 'scalar') {
              tokenIndex += 1;
              continue;
            }
            const countToken = tokens[tokenIndex];
            tokenIndex += 1;
            const count = countToken
              ? parsePlyAsciiScalar(property.countType, countToken)
              : Number.NaN;
            if (!Number.isFinite(count) || count < 0) {
              return {
                kind: 'failed',
                code: 'import-resolution-failed',
                message: `Imported ".ply" shape "${source.importName}" contains an invalid face list count`,
              };
            }
            const indices: number[] = [];
            for (let i = 0; i < count; i += 1) {
              const token = tokens[tokenIndex];
              tokenIndex += 1;
              const index = token ? parsePlyAsciiScalar(property.elementType, token) : Number.NaN;
              if (!Number.isFinite(index) || index < 0 || index >= vertices.length) {
                return {
                  kind: 'failed',
                  code: 'import-resolution-failed',
                  message: `Imported ".ply" shape "${source.importName}" contains an out-of-range face index`,
                };
              }
              indices.push(index);
            }
            faces.push(...triangulatePlyFace(indices));
          }
        }
      }
    }
  } else {
    let offset = parsedHeader.headerLength;
    const littleEndian = parsedHeader.format === 'binary_little_endian';

    for (const element of parsedHeader.elements) {
      for (let elementIndex = 0; elementIndex < element.count; elementIndex += 1) {
        if (element.name === 'vertex') {
          const values = new Map<string, number>();
          for (const property of element.properties) {
            if (property.kind !== 'scalar') {
              return {
                kind: 'failed',
                code: 'import-resolution-failed',
                message: `Imported ".ply" shape "${source.importName}" uses an unsupported vertex list property`,
              };
            }
            const result = readPlyBinaryScalar(buffer, offset, property.type, littleEndian);
            if (!result) {
              return {
                kind: 'failed',
                code: 'import-resolution-failed',
                message: `Imported ".ply" shape "${source.importName}" contains an incomplete binary vertex record`,
              };
            }
            values.set(property.name, result.value);
            offset = result.nextOffset;
          }
          vertices.push([values.get('x') ?? 0, values.get('y') ?? 0, values.get('z') ?? 0]);
          continue;
        }

        if (element.name === 'face') {
          for (const property of element.properties) {
            if (property.kind === 'scalar') {
              const result = readPlyBinaryScalar(buffer, offset, property.type, littleEndian);
              if (!result) {
                return {
                  kind: 'failed',
                  code: 'import-resolution-failed',
                  message: `Imported ".ply" shape "${source.importName}" contains an incomplete binary face record`,
                };
              }
              offset = result.nextOffset;
              continue;
            }
            const countResult = readPlyBinaryScalar(
              buffer,
              offset,
              property.countType,
              littleEndian,
            );
            if (!countResult || !Number.isFinite(countResult.value) || countResult.value < 0) {
              return {
                kind: 'failed',
                code: 'import-resolution-failed',
                message: `Imported ".ply" shape "${source.importName}" contains an invalid binary face list count`,
              };
            }
            offset = countResult.nextOffset;
            const indices: number[] = [];
            for (let i = 0; i < countResult.value; i += 1) {
              const indexResult = readPlyBinaryScalar(
                buffer,
                offset,
                property.elementType,
                littleEndian,
              );
              if (
                !indexResult ||
                !Number.isFinite(indexResult.value) ||
                indexResult.value < 0 ||
                indexResult.value >= vertices.length
              ) {
                return {
                  kind: 'failed',
                  code: 'import-resolution-failed',
                  message: `Imported ".ply" shape "${source.importName}" contains an out-of-range binary face index`,
                };
              }
              indices.push(indexResult.value);
              offset = indexResult.nextOffset;
            }
            faces.push(...triangulatePlyFace(indices));
          }
          continue;
        }

        for (const property of element.properties) {
          if (property.kind === 'scalar') {
            const result = readPlyBinaryScalar(buffer, offset, property.type, littleEndian);
            if (!result) {
              return {
                kind: 'failed',
                code: 'import-resolution-failed',
                message: `Imported ".ply" shape "${source.importName}" contains incomplete binary element data`,
              };
            }
            offset = result.nextOffset;
            continue;
          }
          const countResult = readPlyBinaryScalar(buffer, offset, property.countType, littleEndian);
          if (!countResult || !Number.isFinite(countResult.value) || countResult.value < 0) {
            return {
              kind: 'failed',
              code: 'import-resolution-failed',
              message: `Imported ".ply" shape "${source.importName}" contains an invalid binary list count`,
            };
          }
          offset = countResult.nextOffset;
          for (let i = 0; i < countResult.value; i += 1) {
            const result = readPlyBinaryScalar(buffer, offset, property.elementType, littleEndian);
            if (!result) {
              return {
                kind: 'failed',
                code: 'import-resolution-failed',
                message: `Imported ".ply" shape "${source.importName}" contains incomplete binary list data`,
              };
            }
            offset = result.nextOffset;
          }
        }
      }
    }
  }

  if (!vertexElement || !faceElement) {
    return {
      kind: 'failed',
      code: 'import-resolution-failed',
      message: `Imported ".ply" shape "${source.importName}" must contain both vertex and face elements`,
    };
  }

  return finalizePolyhedronGeometry('ply', source, vertices, faces);
}

export function loadImportedShapeGeometry(
  _shape: ZtkShape,
  source: ZtkImportedShapeSource,
): ZtkImportedShapeResolution {
  switch (source.format) {
    case 'ply':
      return parsePlyImportedGeometry(source);
    case 'stl':
      return parseStlImportedGeometry(source);
    case 'obj':
      return parseObjImportedGeometry(source);
    default:
      return {
        kind: 'failed',
        code: 'unsupported-import-resolution',
        message: `Built-in import materialization for "${source.format}" is not implemented yet`,
      };
  }
}
