export type NodeBufferLike = Uint8Array & {
  indexOf(value: string, byteOffset?: number): number;
  toString(encoding?: string, start?: number, end?: number): string;
  readInt8(offset: number): number;
  readUInt8(offset: number): number;
  readInt16LE(offset: number): number;
  readInt16BE(offset: number): number;
  readUInt16LE(offset: number): number;
  readUInt16BE(offset: number): number;
  readInt32LE(offset: number): number;
  readInt32BE(offset: number): number;
  readUInt32LE(offset: number): number;
  readUInt32BE(offset: number): number;
  readFloatLE(offset: number): number;
  readFloatBE(offset: number): number;
  readDoubleLE(offset: number): number;
  readDoubleBE(offset: number): number;
};

type NodeFsModule = {
  readFileSync(path: string, encoding: 'utf8'): string;
  readFileSync(path: string): NodeBufferLike;
};

type NodeLikeProcess = {
  versions?: {
    node?: string;
  };
  getBuiltinModule?: (id: string) => unknown;
};

type NodeFileReadResult<T> =
  | {
      ok: true;
      value: T;
    }
  | {
      ok: false;
      code: 'filesystem-unavailable' | 'read-failed';
      message: string;
    };

function getNodeFsModule(): NodeFsModule | undefined {
  const processValue = (globalThis as { process?: NodeLikeProcess }).process;
  if (!processValue?.versions?.node || typeof processValue.getBuiltinModule !== 'function') {
    return undefined;
  }

  const fsModule = processValue.getBuiltinModule('node:fs');
  if (!fsModule || typeof (fsModule as NodeFsModule).readFileSync !== 'function') {
    return undefined;
  }

  return fsModule as NodeFsModule;
}

export function readNodeFileTextSync(path: string): NodeFileReadResult<string> {
  const fsModule = getNodeFsModule();
  if (!fsModule) {
    return {
      ok: false,
      code: 'filesystem-unavailable',
      message:
        'Built-in import materialization requires Node.js filesystem access and is not available in browser environments',
    };
  }

  try {
    return {
      ok: true,
      value: fsModule.readFileSync(path, 'utf8'),
    };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      code: 'read-failed',
      message: detail,
    };
  }
}

export function readNodeFileBufferSync(path: string): NodeFileReadResult<NodeBufferLike> {
  const fsModule = getNodeFsModule();
  if (!fsModule) {
    return {
      ok: false,
      code: 'filesystem-unavailable',
      message:
        'Built-in import materialization requires Node.js filesystem access and is not available in browser environments',
    };
  }

  try {
    return {
      ok: true,
      value: fsModule.readFileSync(path),
    };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      code: 'read-failed',
      message: detail,
    };
  }
}
