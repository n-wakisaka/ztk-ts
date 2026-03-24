import { getSections, type ZtkDocument, type ZtkKeyValueNode, type ZtkSection } from './ast.js';

export type ZtkDiagnostic = {
  code: string;
  message: string;
  tag: string | null;
  key?: string;
};

export type ZtkVec2 = [number, number];
export type ZtkVec3 = [number, number, number];
export type ZtkMat3 = [number, number, number, number, number, number, number, number, number];
export type ZtkAutoOrVec3 = ZtkVec3 | 'auto';
export type ZtkAutoOrMat3 = ZtkMat3 | 'auto';
export type ZtkMat3x4 = [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
];

export type ZtkTransform = {
  pos?: ZtkVec3;
  att?: ZtkMat3;
  frame?: ZtkMat3x4;
  rotations: string[][];
  dh?: number[];
  resolved: ZtkResolvedTransform;
};

export type ZtkResolvedTransformMode = 'identity' | 'frame' | 'pos_att' | 'procedural' | 'partial';

export type ZtkResolvedTransform = {
  mode: ZtkResolvedTransformMode;
  pos: ZtkVec3;
  att: ZtkMat3;
  frame: ZtkMat3x4;
};

export type ZtkChain = {
  tag: 'roki::chain';
  section: ZtkSection;
  name?: string;
  unknownKeys: ZtkKeyValueNode[];
};

export type ZtkChainInit = {
  tag: 'roki::chain::init';
  section: ZtkSection;
  transform: ZtkTransform;
  joints: number[][];
  jointStates: ZtkChainInitJointState[];
  unknownKeys: ZtkKeyValueNode[];
};

export type ZtkChainInitJointState = {
  linkName?: string;
  values: number[];
  link?: ZtkLink;
};

export type ZtkIkJoint = {
  selector: string;
  weight?: number;
  values: number[];
  link?: ZtkLink;
};

export type ZtkIkConstraintType =
  | 'world_pos'
  | 'world_att'
  | 'l2l_pos'
  | 'l2l_att'
  | 'com'
  | 'angular_momentum'
  | 'angular_momentum_about_com'
  | string;

export type ZtkIkConstraint = {
  priority?: number;
  name?: string;
  type?: ZtkIkConstraintType;
  tokens: string[];
  linkNames: string[];
  links: ZtkLink[];
  attentionPoint?: ZtkVec3;
  weight?: ZtkVec3;
  unknownTokens: string[];
};

export type ZtkChainIk = {
  tag: 'roki::chain::ik';
  section: ZtkSection;
  joints: ZtkIkJoint[];
  constraints: ZtkIkConstraint[];
  unknownKeys: ZtkKeyValueNode[];
};

export type ZtkMotorType = 'none' | 'dc' | 'trq' | string;

export type ZtkMotor = {
  tag: 'roki::motor';
  section: ZtkSection;
  name?: string;
  type?: ZtkMotorType;
  min?: number;
  max?: number;
  motorConstant?: number;
  admittance?: number;
  maxVoltage?: number;
  minVoltage?: number;
  gearRatio?: number;
  rotorInertia?: number;
  gearInertia?: number;
  compK?: number;
  compL?: number;
  unknownKeys: ZtkKeyValueNode[];
};

export type ZtkContactType = 'rigid' | 'elastic';

export type ZtkContact = {
  tag: 'roki::contact';
  section: ZtkSection;
  bind?: [string, string];
  staticFriction?: number;
  kineticFriction?: number;
  compensation?: number;
  relaxation?: number;
  elasticity?: number;
  viscosity?: number;
  contactType?: ZtkContactType;
  unknownKeys: ZtkKeyValueNode[];
};

export type ZtkJointType =
  | 'fixed'
  | 'revolute'
  | 'prismatic'
  | 'cylindrical'
  | 'hooke'
  | 'spherical'
  | 'planar'
  | 'float'
  | 'breakablefloat'
  | string;

export type ZtkLink = {
  tag: 'roki::link';
  section: ZtkSection;
  name?: string;
  jointType?: ZtkJointType;
  joint: ZtkJointSpec;
  mass?: number;
  density?: number;
  stuff?: string;
  com?: ZtkAutoOrVec3;
  inertia?: ZtkAutoOrMat3;
  massProperties: ZtkMassProperties;
  transform: ZtkTransform;
  dis?: number[];
  breakValues?: number[];
  min?: number;
  max?: number;
  stiffness?: number;
  viscosity?: number;
  coulomb?: number;
  staticFriction?: number;
  forceThreshold?: number;
  torqueThreshold?: number;
  motorName?: string;
  shapeNames: string[];
  parentName?: string;
  bindName?: string;
  motor?: ZtkMotor;
  shapes: ZtkShape[];
  parent?: ZtkLink;
  bind?: ZtkLink;
  children: ZtkLink[];
  unknownKeys: ZtkKeyValueNode[];
};

export type ZtkJointBaseType =
  | 'fixed'
  | 'revolute'
  | 'prismatic'
  | 'cylindrical'
  | 'hooke'
  | 'spherical'
  | 'planar'
  | 'float'
  | 'breakablefloat'
  | string;

export type ZtkJointSpec = {
  rawType?: string;
  baseType?: ZtkJointBaseType;
  modifiers: string[];
  dof?: number;
  isActive: boolean;
  displacement?: number[];
  breakThresholds?: number[];
  min?: number;
  max?: number;
  stiffness?: number;
  viscosity?: number;
  coulomb?: number;
  staticFriction?: number;
  forceThreshold?: number;
  torqueThreshold?: number;
  motorName?: string;
  motor?: ZtkMotor;
};

export type ZtkMassProperties = {
  mass?: number;
  density?: number;
  stuff?: string;
  com?: ZtkAutoOrVec3;
  inertia?: ZtkAutoOrMat3;
};

export type ZtkOptic = {
  tag: 'zeo::optic';
  section: ZtkSection;
  name?: string;
  ambient?: ZtkVec3;
  diffuse?: ZtkVec3;
  specular?: ZtkVec3;
  esr?: number;
  shininess?: number;
  alpha?: number;
  unknownKeys: ZtkKeyValueNode[];
};

export type ZtkTextureType = 'color' | 'bump' | string;

export type ZtkTextureCoord = {
  index: number;
  uv: ZtkVec2;
};

export type ZtkTextureFace = {
  indices: [number, number, number];
};

export type ZtkTexture = {
  tag: 'zeo::texture';
  section: ZtkSection;
  name?: string;
  file?: string;
  type?: ZtkTextureType;
  depth?: number;
  coords: ZtkTextureCoord[];
  faces: ZtkTextureFace[];
  unknownKeys: ZtkKeyValueNode[];
};

export type ZtkMapTerraGrid = {
  index: [number, number];
  z: number;
  normal: ZtkVec3;
  variance: number;
  traversable: boolean;
};

export type ZtkMapTerra = {
  origin?: [number, number];
  resolution?: [number, number];
  size?: [number, number];
  zrange?: [number, number];
  thVar?: number;
  thGrid?: number;
  thRes?: number;
  grids: ZtkMapTerraGrid[];
};

export type ZtkMap = {
  tag: 'zeo::map';
  section: ZtkSection;
  name?: string;
  type?: string;
  terra?: ZtkMapTerra;
  unknownKeys: ZtkKeyValueNode[];
};

export type ZtkShapeGeometry =
  | {
      type: 'box';
      center?: ZtkVec3;
      ax?: ZtkVec3 | 'auto';
      ay?: ZtkVec3 | 'auto';
      az?: ZtkVec3 | 'auto';
      depth?: number;
      width?: number;
      height?: number;
    }
  | {
      type: 'sphere';
      center?: ZtkVec3;
      radius?: number;
      div?: number;
    }
  | {
      type: 'cylinder';
      centers: ZtkVec3[];
      radius?: number;
      div?: number;
    }
  | {
      type: 'cone';
      center?: ZtkVec3;
      vert?: ZtkVec3;
      radius?: number;
      div?: number;
    }
  | {
      type: 'capsule';
      centers: ZtkVec3[];
      radius?: number;
      div?: number;
    }
  | {
      type: 'ellipsoid';
      center?: ZtkVec3;
      ax?: ZtkVec3 | 'auto';
      ay?: ZtkVec3 | 'auto';
      az?: ZtkVec3 | 'auto';
      rx?: number;
      ry?: number;
      rz?: number;
      div?: number;
    }
  | {
      type: 'ellipticcylinder';
      centers: ZtkVec3[];
      radii: number[];
      ref?: ZtkVec3;
      div?: number;
    }
  | {
      type: 'polyhedron';
      vertices: number[][];
      faces: number[][];
      loops: number[][];
      proceduralLoops: string[][];
      prisms: number[][];
      pyramids: number[][];
    }
  | {
      type: 'nurbs';
      dim?: number[];
      uKnots: number[][];
      vKnots: number[][];
      sizes: number[][];
      controlPoints: number[][];
      slices: number[][];
    }
  | {
      type: string;
    };

export type ZtkShape = {
  tag: 'zeo::shape';
  section: ZtkSection;
  name?: string;
  type?: string;
  opticName?: string;
  textureName?: string;
  texture?: ZtkTexture;
  mirrorName?: string;
  mirrorAxis?: string;
  importName?: string;
  importScale?: number;
  optic?: ZtkOptic;
  mirror?: ZtkShape;
  transform: ZtkTransform;
  geometry: ZtkShapeGeometry;
  unknownKeys: ZtkKeyValueNode[];
};

export type ZtkSemanticDocument = {
  source: ZtkDocument;
  chain?: ZtkChain;
  chainInit?: ZtkChainInit;
  chainIk?: ZtkChainIk;
  motors: ZtkMotor[];
  contacts: ZtkContact[];
  links: ZtkLink[];
  optics: ZtkOptic[];
  textures: ZtkTexture[];
  shapes: ZtkShape[];
  maps: ZtkMap[];
  unknownSections: ZtkSection[];
  diagnostics: ZtkDiagnostic[];
};

function parseText(node: ZtkKeyValueNode | undefined): string | undefined {
  if (!node) {
    return undefined;
  }

  if (node.values.length > 0) {
    return node.values.join(' ');
  }

  const value = node.rawValue.trim();
  return value.length > 0 ? value : undefined;
}

const JOINT_DOF: Record<string, number> = {
  fixed: 0,
  revolute: 1,
  prismatic: 1,
  cylindrical: 2,
  hooke: 2,
  spherical: 3,
  planar: 3,
  float: 6,
  breakablefloat: 6,
};

function parseJointSpec(
  jointType: string | undefined,
  values: {
    dis?: number[];
    breakValues?: number[];
    min?: number;
    max?: number;
    stiffness?: number;
    viscosity?: number;
    coulomb?: number;
    staticFriction?: number;
    forceThreshold?: number;
    torqueThreshold?: number;
    motorName?: string;
  },
  diagnostics: ZtkDiagnostic[],
  tag: string | null,
): ZtkJointSpec {
  const tokens =
    jointType
      ?.split(/\s+/)
      .map((token) => token.trim())
      .filter((token) => token.length > 0) ?? [];
  const baseType = tokens[0];
  const modifiers = tokens.slice(1);
  const dof = baseType ? JOINT_DOF[baseType] : undefined;

  if (baseType && dof === undefined) {
    diagnostics.push({
      code: 'unknown-jointtype',
      message: `Unknown joint type "${jointType}"`,
      tag,
      key: 'jointtype',
    });
  }

  const isActive = baseType !== undefined && baseType !== 'fixed' && !modifiers.includes('passive');

  return {
    rawType: jointType,
    baseType,
    modifiers,
    dof,
    isActive,
    displacement: values.dis,
    breakThresholds: values.breakValues,
    min: values.min,
    max: values.max,
    stiffness: values.stiffness,
    viscosity: values.viscosity,
    coulomb: values.coulomb,
    staticFriction: values.staticFriction,
    forceThreshold: values.forceThreshold,
    torqueThreshold: values.torqueThreshold,
    motorName: values.motorName,
  };
}

function parseNumberValue(
  node: ZtkKeyValueNode | undefined,
  diagnostics: ZtkDiagnostic[],
  tag: string | null,
): number | undefined {
  if (!node) {
    return undefined;
  }

  const value = parseText(node);
  if (value === undefined) {
    return undefined;
  }

  const num = Number(value);
  if (Number.isNaN(num)) {
    diagnostics.push({
      code: 'invalid-number',
      message: `Expected numeric value but got "${value}"`,
      tag,
      key: node.key,
    });
    return undefined;
  }

  return num;
}

function parseNumberList(
  node: ZtkKeyValueNode | undefined,
  diagnostics: ZtkDiagnostic[],
  tag: string | null,
): number[] | undefined {
  if (!node) {
    return undefined;
  }

  const values: number[] = [];
  for (const token of node.values) {
    const num = Number(token);
    if (Number.isNaN(num)) {
      diagnostics.push({
        code: 'invalid-number',
        message: `Expected numeric token but got "${token}"`,
        tag,
        key: node.key,
      });
      return undefined;
    }
    values.push(num);
  }
  return values;
}

function isNumericTokenList(values: string[]): boolean {
  return values.every((token) => !Number.isNaN(Number(token)));
}

function parseJointState(
  node: ZtkKeyValueNode,
  diagnostics: ZtkDiagnostic[],
  tag: string | null,
): ZtkChainInitJointState | undefined {
  if (node.values.length === 0) {
    return {
      values: [],
    };
  }

  const firstValue = node.values[0];
  const firstNumber = Number(firstValue);
  const hasLinkName = Number.isNaN(firstNumber);
  const linkName = hasLinkName ? firstValue : undefined;
  const valueTokens = hasLinkName ? node.values.slice(1) : node.values;
  const values: number[] = [];

  for (const token of valueTokens) {
    const num = Number(token);
    if (Number.isNaN(num)) {
      diagnostics.push({
        code: 'invalid-number',
        message: `Expected numeric token but got "${token}"`,
        tag,
        key: node.key,
      });
      return undefined;
    }
    values.push(num);
  }

  return {
    linkName,
    values,
  };
}

function parseNamedJointState(node: ZtkKeyValueNode): ZtkChainInitJointState | undefined {
  const values: number[] = [];
  for (const token of node.values) {
    const num = Number(token);
    if (Number.isNaN(num)) {
      return undefined;
    }
    values.push(num);
  }

  return {
    linkName: node.key,
    values,
  };
}

function parseVec3(
  node: ZtkKeyValueNode | undefined,
  diagnostics: ZtkDiagnostic[],
  tag: string | null,
): ZtkVec3 | undefined {
  const values = parseNumberList(node, diagnostics, tag);
  if (!values) {
    return undefined;
  }
  if (values.length < 3) {
    diagnostics.push({
      code: 'invalid-arity',
      message: `Expected 3 numbers but got ${values.length}`,
      tag,
      key: node?.key,
    });
    return undefined;
  }
  return [values[0], values[1], values[2]];
}

function parseVec2(
  node: ZtkKeyValueNode | undefined,
  diagnostics: ZtkDiagnostic[],
  tag: string | null,
): ZtkVec2 | undefined {
  const values = parseNumberList(node, diagnostics, tag);
  if (!values) {
    return undefined;
  }
  if (values.length < 2) {
    diagnostics.push({
      code: 'invalid-arity',
      message: `Expected 2 numbers but got ${values.length}`,
      tag,
      key: node?.key,
    });
    return undefined;
  }
  return [values[0], values[1]];
}

function parseMat3(
  node: ZtkKeyValueNode | undefined,
  diagnostics: ZtkDiagnostic[],
  tag: string | null,
): ZtkMat3 | undefined {
  const values = parseNumberList(node, diagnostics, tag);
  if (!values) {
    return undefined;
  }
  if (values.length < 9) {
    diagnostics.push({
      code: 'invalid-arity',
      message: `Expected 9 numbers but got ${values.length}`,
      tag,
      key: node?.key,
    });
    return undefined;
  }
  return [
    values[0],
    values[1],
    values[2],
    values[3],
    values[4],
    values[5],
    values[6],
    values[7],
    values[8],
  ];
}

function parseMat3x4(
  node: ZtkKeyValueNode | undefined,
  diagnostics: ZtkDiagnostic[],
  tag: string | null,
): ZtkMat3x4 | undefined {
  const values = parseNumberList(node, diagnostics, tag);
  if (!values) {
    return undefined;
  }
  if (values.length < 12) {
    diagnostics.push({
      code: 'invalid-arity',
      message: `Expected 12 numbers but got ${values.length}`,
      tag,
      key: node?.key,
    });
    return undefined;
  }
  return [
    values[0],
    values[1],
    values[2],
    values[3],
    values[4],
    values[5],
    values[6],
    values[7],
    values[8],
    values[9],
    values[10],
    values[11],
  ];
}

function parseAxis(
  node: ZtkKeyValueNode | undefined,
  diagnostics: ZtkDiagnostic[],
  tag: string | null,
): ZtkVec3 | 'auto' | undefined {
  const text = parseText(node);
  if (text === undefined) {
    return undefined;
  }
  if (text === 'auto') {
    return 'auto';
  }
  return parseVec3(node, diagnostics, tag);
}

function parseVec3OrAuto(
  node: ZtkKeyValueNode | undefined,
  diagnostics: ZtkDiagnostic[],
  tag: string | null,
): ZtkAutoOrVec3 | undefined {
  const text = parseText(node);
  if (text === undefined) {
    return undefined;
  }
  if (text === 'auto') {
    return 'auto';
  }
  return parseVec3(node, diagnostics, tag);
}

function parseMat3OrAuto(
  node: ZtkKeyValueNode | undefined,
  diagnostics: ZtkDiagnostic[],
  tag: string | null,
): ZtkAutoOrMat3 | undefined {
  const text = parseText(node);
  if (text === undefined) {
    return undefined;
  }
  if (text === 'auto') {
    return 'auto';
  }
  return parseMat3(node, diagnostics, tag);
}

function createIdentityMat3(): ZtkMat3 {
  return [1, 0, 0, 0, 1, 0, 0, 0, 1];
}

function createZeroVec3(): ZtkVec3 {
  return [0, 0, 0];
}

function createFrameFromPosAtt(pos: ZtkVec3, att: ZtkMat3): ZtkMat3x4 {
  return [
    att[0],
    att[1],
    att[2],
    pos[0],
    att[3],
    att[4],
    att[5],
    pos[1],
    att[6],
    att[7],
    att[8],
    pos[2],
  ];
}

function createResolvedFromFrame(frame: ZtkMat3x4): ZtkResolvedTransform {
  const pos: ZtkVec3 = [frame[3], frame[7], frame[11]];
  const att: ZtkMat3 = [
    frame[0],
    frame[1],
    frame[2],
    frame[4],
    frame[5],
    frame[6],
    frame[8],
    frame[9],
    frame[10],
  ];

  return {
    mode: 'frame',
    pos,
    att,
    frame,
  };
}

function createResolvedFromPosAtt(pos?: ZtkVec3, att?: ZtkMat3): ZtkResolvedTransform {
  const resolvedPos = pos ?? createZeroVec3();
  const resolvedAtt = att ?? createIdentityMat3();
  return {
    mode: 'pos_att',
    pos: resolvedPos,
    att: resolvedAtt,
    frame: createFrameFromPosAtt(resolvedPos, resolvedAtt),
  };
}

function createResolvedFromDh(dh: number[]): ZtkResolvedTransform | undefined {
  if (dh.length < 4) {
    return undefined;
  }

  const [a, alpha, d, theta] = dh;
  const sa = Math.sin(alpha);
  const ca = Math.cos(alpha);
  const st = Math.sin(theta);
  const ct = Math.cos(theta);

  return createResolvedFromPosAtt(
    [a, -d * sa, d * ca],
    [ct, -st, 0, ca * st, ca * ct, -sa, sa * st, sa * ct, ca],
  );
}

function multiplyMat3(left: ZtkMat3, right: ZtkMat3): ZtkMat3 {
  return [
    left[0] * right[0] + left[1] * right[3] + left[2] * right[6],
    left[0] * right[1] + left[1] * right[4] + left[2] * right[7],
    left[0] * right[2] + left[1] * right[5] + left[2] * right[8],
    left[3] * right[0] + left[4] * right[3] + left[5] * right[6],
    left[3] * right[1] + left[4] * right[4] + left[5] * right[7],
    left[3] * right[2] + left[4] * right[5] + left[5] * right[8],
    left[6] * right[0] + left[7] * right[3] + left[8] * right[6],
    left[6] * right[1] + left[7] * right[4] + left[8] * right[7],
    left[6] * right[2] + left[7] * right[5] + left[8] * right[8],
  ];
}

function createMat3FromAngleAxis(angleAxis: ZtkVec3): ZtkMat3 {
  const [x, y, z] = angleAxis;
  const angle = Math.hypot(x, y, z);
  if (angle === 0) {
    return createIdentityMat3();
  }

  const axisX = x / angle;
  const axisY = y / angle;
  const axisZ = z / angle;
  const sin = Math.sin(angle);
  const cos = Math.cos(angle);
  const t = 1 - cos;

  return [
    t * axisX * axisX + cos,
    t * axisX * axisY - sin * axisZ,
    t * axisX * axisZ + sin * axisY,
    t * axisY * axisX + sin * axisZ,
    t * axisY * axisY + cos,
    t * axisY * axisZ - sin * axisX,
    t * axisZ * axisX - sin * axisY,
    t * axisZ * axisY + sin * axisX,
    t * axisZ * axisZ + cos,
  ];
}

function parseAngleAxisRotation(
  node: ZtkKeyValueNode,
  diagnostics: ZtkDiagnostic[],
  tag: string | null,
): ZtkVec3 | undefined {
  const values = parseNumberList(node, diagnostics, tag);
  if (!values) {
    return undefined;
  }
  if (values.length < 4) {
    diagnostics.push({
      code: 'invalid-arity',
      message: `Expected 4 numbers but got ${values.length}`,
      tag,
      key: node.key,
    });
    return undefined;
  }

  const [axisX, axisY, axisZ, angleInDegrees] = values;
  const axisLength = Math.hypot(axisX, axisY, axisZ);
  if (axisLength === 0) {
    return [0, 0, 0];
  }

  const angleInRadians = (angleInDegrees * Math.PI) / 180;
  return [
    (axisX / axisLength) * angleInRadians,
    (axisY / axisLength) * angleInRadians,
    (axisZ / axisLength) * angleInRadians,
  ];
}

function createIdentityTransform(): ZtkResolvedTransform {
  const pos = createZeroVec3();
  const att = createIdentityMat3();
  return {
    mode: 'identity',
    pos,
    att,
    frame: createFrameFromPosAtt(pos, att),
  };
}

function resolveTransform(
  nodes: ZtkKeyValueNode[],
  _raw: Pick<ZtkTransform, 'pos' | 'att' | 'frame' | 'rotations' | 'dh'>,
  diagnostics: ZtkDiagnostic[],
  tag: string | null,
): ZtkResolvedTransform {
  let pos = createZeroVec3();
  let att = createIdentityMat3();
  let mode: ZtkResolvedTransformMode = 'identity';

  for (const node of nodes) {
    switch (node.key) {
      case 'pos': {
        const value = parseVec3(node, diagnostics, tag);
        if (value) {
          pos = value;
          mode = mode === 'identity' ? 'pos_att' : mode;
        }
        break;
      }
      case 'att': {
        const value = parseMat3(node, diagnostics, tag);
        if (value) {
          att = value;
          mode = mode === 'identity' ? 'pos_att' : mode;
        }
        break;
      }
      case 'rot': {
        const angleAxis = parseAngleAxisRotation(node, diagnostics, tag);
        if (angleAxis) {
          att = multiplyMat3(createMat3FromAngleAxis(angleAxis), att);
          mode = mode === 'identity' ? 'pos_att' : mode;
        }
        break;
      }
      case 'frame': {
        const value = parseMat3x4(node, diagnostics, tag);
        if (value) {
          const resolved = createResolvedFromFrame(value);
          pos = resolved.pos;
          att = resolved.att;
          mode = 'frame';
        }
        break;
      }
      case 'DH': {
        const value = parseNumberList(node, diagnostics, tag);
        if (value) {
          const resolved = createResolvedFromDh(value);
          if (resolved) {
            pos = resolved.pos;
            att = resolved.att;
            mode = 'frame';
          }
        }
        break;
      }
      default:
        break;
    }
  }

  if (mode === 'identity') {
    return createIdentityTransform();
  }

  return {
    mode,
    pos,
    att,
    frame: createFrameFromPosAtt(pos, att),
  };
}

function createEntries(section: ZtkSection): Map<string, ZtkKeyValueNode[]> {
  const entries = new Map<string, ZtkKeyValueNode[]>();
  for (const node of section.nodes) {
    const list = entries.get(node.key);
    if (list) {
      list.push(node);
      continue;
    }
    entries.set(node.key, [node]);
  }
  return entries;
}

function first(entries: Map<string, ZtkKeyValueNode[]>, key: string): ZtkKeyValueNode | undefined {
  return entries.get(key)?.[0];
}

function all(entries: Map<string, ZtkKeyValueNode[]>, key: string): ZtkKeyValueNode[] {
  return entries.get(key) ?? [];
}

function take(
  entries: Map<string, ZtkKeyValueNode[]>,
  key: string,
  count: number,
): ZtkKeyValueNode[] {
  return all(entries, key).slice(0, count);
}

function markUsed(
  used: Set<ZtkKeyValueNode>,
  nodes: ZtkKeyValueNode | ZtkKeyValueNode[] | (ZtkKeyValueNode | undefined)[] | undefined,
): void {
  if (!nodes) {
    return;
  }
  if (Array.isArray(nodes)) {
    for (const node of nodes) {
      if (node) {
        used.add(node);
      }
    }
    return;
  }
  used.add(nodes);
}

function unknownKeys(section: ZtkSection, used: Set<ZtkKeyValueNode>): ZtkKeyValueNode[] {
  return section.nodes.filter((node) => !used.has(node));
}

function parseTransform(
  section: ZtkSection,
  entries: Map<string, ZtkKeyValueNode[]>,
  used: Set<ZtkKeyValueNode>,
  diagnostics: ZtkDiagnostic[],
  tag: string | null,
): ZtkTransform {
  const posNodes = all(entries, 'pos');
  const attNodes = all(entries, 'att');
  const frameNodes = all(entries, 'frame');
  const dhNodes = all(entries, 'DH');
  const rotNodes = all(entries, 'rot');
  const transformNodes = section.nodes.filter(
    (node) =>
      node.key === 'pos' ||
      node.key === 'att' ||
      node.key === 'rot' ||
      node.key === 'frame' ||
      node.key === 'DH',
  );

  markUsed(used, posNodes);
  markUsed(used, attNodes);
  markUsed(used, frameNodes);
  markUsed(used, dhNodes);
  markUsed(used, rotNodes);

  const rawTransform = {
    pos: parseVec3(posNodes[0], diagnostics, tag),
    att: parseMat3(attNodes[0], diagnostics, tag),
    frame: parseMat3x4(frameNodes[0], diagnostics, tag),
    rotations: rotNodes.map((node) => [...node.values]),
    dh: parseNumberList(dhNodes[0], diagnostics, tag),
  };

  return {
    ...rawTransform,
    resolved: resolveTransform(transformNodes, rawTransform, diagnostics, tag),
  };
}

function parseChain(section: ZtkSection, _diagnostics: ZtkDiagnostic[]): ZtkChain {
  const entries = createEntries(section);
  const used = new Set<ZtkKeyValueNode>();
  const nameNode = first(entries, 'name');
  markUsed(used, nameNode);

  return {
    tag: 'roki::chain',
    section,
    name: parseText(nameNode),
    unknownKeys: unknownKeys(section, used),
  };
}

function parseChainInit(section: ZtkSection, diagnostics: ZtkDiagnostic[]): ZtkChainInit {
  const entries = createEntries(section);
  const used = new Set<ZtkKeyValueNode>();
  const jointNodes = all(entries, 'joint');
  markUsed(used, jointNodes);

  const jointStates = jointNodes
    .map((node) => parseJointState(node, diagnostics, 'roki::chain::init'))
    .filter((value): value is ZtkChainInitJointState => value !== undefined);

  for (const node of section.nodes) {
    if (used.has(node)) {
      continue;
    }
    if (
      node.key !== 'pos' &&
      node.key !== 'att' &&
      node.key !== 'frame' &&
      node.key !== 'DH' &&
      node.key !== 'rot' &&
      node.values.length > 0
    ) {
      const jointState = parseNamedJointState(node);
      if (jointState) {
        jointStates.push(jointState);
        used.add(node);
      }
    }
  }

  return {
    tag: 'roki::chain::init',
    section,
    transform: parseTransform(section, entries, used, diagnostics, 'roki::chain::init'),
    joints: jointStates.map((jointState) => jointState.values),
    jointStates,
    unknownKeys: unknownKeys(section, used),
  };
}

function parseIkJoint(
  node: ZtkKeyValueNode,
  diagnostics: ZtkDiagnostic[],
  tag: string | null,
): ZtkIkJoint | undefined {
  const [selector, weightToken, ...valueTokens] = node.values;
  if (!selector) {
    return undefined;
  }

  let weight: number | undefined;
  let values = valueTokens;
  if (weightToken) {
    const parsed = Number(weightToken);
    if (Number.isFinite(parsed)) {
      weight = parsed;
    } else {
      values = [weightToken, ...valueTokens];
    }
  }

  const parsedValues: number[] = [];
  for (const token of values) {
    const parsed = Number(token);
    if (!Number.isFinite(parsed)) {
      diagnostics.push({
        code: 'invalid-number',
        message: `Could not parse number "${token}"`,
        tag,
        key: node.key,
      });
      continue;
    }
    parsedValues.push(parsed);
  }

  return {
    selector,
    weight,
    values: parsedValues,
  };
}

function parseIkVec3At(
  tokens: string[],
  index: number,
  diagnostics: ZtkDiagnostic[],
  tag: string | null,
  key: string,
): { value?: ZtkVec3; nextIndex: number } {
  const values = tokens.slice(index + 1, index + 4).map((token) => Number(token));
  if (values.length < 3 || values.some((value) => !Number.isFinite(value))) {
    diagnostics.push({
      code: 'invalid-number',
      message: `Could not parse vec3 near "${tokens[index]}"`,
      tag,
      key,
    });
    return { nextIndex: Math.min(index + 4, tokens.length) };
  }
  return {
    value: [values[0], values[1], values[2]],
    nextIndex: index + 4,
  };
}

function parseIkConstraint(
  node: ZtkKeyValueNode,
  diagnostics: ZtkDiagnostic[],
  tag: string | null,
): ZtkIkConstraint | undefined {
  const [priorityToken, name, type, ...payload] = node.values;
  if (!priorityToken || !name || !type) {
    diagnostics.push({
      code: 'invalid-arity',
      message: `Expected at least 3 values but got ${node.values.length}`,
      tag,
      key: node.key,
    });
    return undefined;
  }

  const priority = Number(priorityToken);
  if (!Number.isFinite(priority)) {
    diagnostics.push({
      code: 'invalid-number',
      message: `Could not parse number "${priorityToken}"`,
      tag,
      key: node.key,
    });
  }

  const constraint: ZtkIkConstraint = {
    priority: Number.isFinite(priority) ? priority : undefined,
    name,
    type,
    tokens: [...payload],
    linkNames: [],
    links: [],
    unknownTokens: [],
  };

  let index = 0;
  while (index < payload.length) {
    const token = payload[index];
    if (token === 'at') {
      const parsed = parseIkVec3At(payload, index, diagnostics, tag, node.key);
      if (parsed.value) {
        constraint.attentionPoint = parsed.value;
      }
      index = parsed.nextIndex;
      continue;
    }
    if (token === 'w') {
      const parsed = parseIkVec3At(payload, index, diagnostics, tag, node.key);
      if (parsed.value) {
        constraint.weight = parsed.value;
      }
      index = parsed.nextIndex;
      continue;
    }

    const acceptsLinks =
      type === 'world_pos' || type === 'world_att' || type === 'l2l_pos' || type === 'l2l_att';
    const maxLinks =
      type === 'l2l_pos' || type === 'l2l_att'
        ? 2
        : type === 'world_pos' || type === 'world_att'
          ? 1
          : 0;
    if (acceptsLinks && constraint.linkNames.length < maxLinks) {
      constraint.linkNames.push(token);
    } else {
      constraint.unknownTokens.push(token);
    }
    index += 1;
  }

  return constraint;
}

function parseChainIk(section: ZtkSection, diagnostics: ZtkDiagnostic[]): ZtkChainIk {
  const entries = createEntries(section);
  const used = new Set<ZtkKeyValueNode>();
  const jointNodes = all(entries, 'joint');
  const constraintNodes = all(entries, 'constraint');
  markUsed(used, jointNodes);
  markUsed(used, constraintNodes);

  return {
    tag: 'roki::chain::ik',
    section,
    joints: jointNodes
      .map((node) => parseIkJoint(node, diagnostics, 'roki::chain::ik'))
      .filter((value): value is ZtkIkJoint => value !== undefined),
    constraints: constraintNodes
      .map((node) => parseIkConstraint(node, diagnostics, 'roki::chain::ik'))
      .filter((value): value is ZtkIkConstraint => value !== undefined),
    unknownKeys: unknownKeys(section, used),
  };
}

function parseMotor(section: ZtkSection, diagnostics: ZtkDiagnostic[]): ZtkMotor {
  const entries = createEntries(section);
  const used = new Set<ZtkKeyValueNode>();

  const nameNode = first(entries, 'name');
  const typeNode = first(entries, 'type');
  const minNode = first(entries, 'min');
  const maxNode = first(entries, 'max');
  const motorConstantNode = first(entries, 'motorconstant');
  const admittanceNode = first(entries, 'admittance');
  const maxVoltageNode = first(entries, 'maxvoltage');
  const minVoltageNode = first(entries, 'minvoltage');
  const gearRatioNode = first(entries, 'gearratio');
  const rotorInertiaNode = first(entries, 'rotorinertia');
  const gearInertiaNode = first(entries, 'gearinertia');
  const compKNode = first(entries, 'compk');
  const compLNode = first(entries, 'compl');

  markUsed(used, [
    nameNode,
    typeNode,
    minNode,
    maxNode,
    motorConstantNode,
    admittanceNode,
    maxVoltageNode,
    minVoltageNode,
    gearRatioNode,
    rotorInertiaNode,
    gearInertiaNode,
    compKNode,
    compLNode,
  ]);

  return {
    tag: 'roki::motor',
    section,
    name: parseText(nameNode),
    type: parseText(typeNode),
    min: parseNumberValue(minNode, diagnostics, 'roki::motor'),
    max: parseNumberValue(maxNode, diagnostics, 'roki::motor'),
    motorConstant: parseNumberValue(motorConstantNode, diagnostics, 'roki::motor'),
    admittance: parseNumberValue(admittanceNode, diagnostics, 'roki::motor'),
    maxVoltage: parseNumberValue(maxVoltageNode, diagnostics, 'roki::motor'),
    minVoltage: parseNumberValue(minVoltageNode, diagnostics, 'roki::motor'),
    gearRatio: parseNumberValue(gearRatioNode, diagnostics, 'roki::motor'),
    rotorInertia: parseNumberValue(rotorInertiaNode, diagnostics, 'roki::motor'),
    gearInertia: parseNumberValue(gearInertiaNode, diagnostics, 'roki::motor'),
    compK: parseNumberValue(compKNode, diagnostics, 'roki::motor'),
    compL: parseNumberValue(compLNode, diagnostics, 'roki::motor'),
    unknownKeys: unknownKeys(section, used),
  };
}

function parseBindPair(node: ZtkKeyValueNode | undefined): [string, string] | undefined {
  const firstValue = node?.values[0];
  const secondValue = node?.values[1];
  if (!firstValue || !secondValue) {
    return undefined;
  }
  return [firstValue, secondValue];
}

function inferContactType(section: ZtkSection): ZtkContactType | undefined {
  let contactType: ZtkContactType | undefined;
  for (const node of section.nodes) {
    if (node.key === 'compensation' || node.key === 'relaxation') {
      contactType = 'rigid';
    }
    if (node.key === 'elasticity' || node.key === 'viscosity') {
      contactType = 'elastic';
    }
  }
  return contactType;
}

function parseContact(section: ZtkSection, diagnostics: ZtkDiagnostic[]): ZtkContact {
  const entries = createEntries(section);
  const used = new Set<ZtkKeyValueNode>();
  const bindNode = first(entries, 'bind');
  const staticFrictionNode = first(entries, 'staticfriction');
  const kineticFrictionNode = first(entries, 'kineticfriction');
  const compensationNode = first(entries, 'compensation');
  const relaxationNode = first(entries, 'relaxation');
  const elasticityNode = first(entries, 'elasticity');
  const viscosityNode = first(entries, 'viscosity');

  markUsed(used, [
    bindNode,
    staticFrictionNode,
    kineticFrictionNode,
    compensationNode,
    relaxationNode,
    elasticityNode,
    viscosityNode,
  ]);

  return {
    tag: 'roki::contact',
    section,
    bind: parseBindPair(bindNode),
    staticFriction: parseNumberValue(staticFrictionNode, diagnostics, 'roki::contact'),
    kineticFriction: parseNumberValue(kineticFrictionNode, diagnostics, 'roki::contact'),
    compensation: parseNumberValue(compensationNode, diagnostics, 'roki::contact'),
    relaxation: parseNumberValue(relaxationNode, diagnostics, 'roki::contact'),
    elasticity: parseNumberValue(elasticityNode, diagnostics, 'roki::contact'),
    viscosity: parseNumberValue(viscosityNode, diagnostics, 'roki::contact'),
    contactType: inferContactType(section),
    unknownKeys: unknownKeys(section, used),
  };
}

function parseLink(section: ZtkSection, diagnostics: ZtkDiagnostic[]): ZtkLink {
  const entries = createEntries(section);
  const used = new Set<ZtkKeyValueNode>();

  const nameNode = first(entries, 'name');
  const jointTypeNode = first(entries, 'jointtype');
  const massNode = first(entries, 'mass');
  const densityNode = first(entries, 'density');
  const stuffNode = first(entries, 'stuff');
  const comNode = first(entries, 'COM');
  const inertiaNode = first(entries, 'inertia');
  const disNode = first(entries, 'dis');
  const minNode = first(entries, 'min');
  const maxNode = first(entries, 'max');
  const stiffnessNode = first(entries, 'stiffness');
  const viscosityNode = first(entries, 'viscosity') ?? first(entries, 'viscos');
  const coulombNode = first(entries, 'coulomb');
  const staticFrictionNode = first(entries, 'staticfriction');
  const breakNode = first(entries, 'break');
  const motorNode = first(entries, 'motor');
  const forceThresholdNode = first(entries, 'forcethreshold');
  const torqueThresholdNode = first(entries, 'torquethreshold');
  const parentNode = first(entries, 'parent');
  const bindNode = first(entries, 'bind');
  const shapeNodes = all(entries, 'shape');

  markUsed(used, [
    nameNode,
    jointTypeNode,
    massNode,
    densityNode,
    stuffNode,
    comNode,
    inertiaNode,
    disNode,
    minNode,
    maxNode,
    stiffnessNode,
    viscosityNode,
    coulombNode,
    staticFrictionNode,
    breakNode,
    motorNode,
    forceThresholdNode,
    torqueThresholdNode,
    parentNode,
    bindNode,
  ]);
  markUsed(used, shapeNodes);

  const jointType = parseText(jointTypeNode);
  const mass = parseNumberValue(massNode, diagnostics, 'roki::link');
  const density = parseNumberValue(densityNode, diagnostics, 'roki::link');
  const stuff = parseText(stuffNode);
  const com = parseVec3OrAuto(comNode, diagnostics, 'roki::link');
  const inertia = parseMat3OrAuto(inertiaNode, diagnostics, 'roki::link');
  const dis = parseNumberList(disNode, diagnostics, 'roki::link');
  const min = parseNumberValue(minNode, diagnostics, 'roki::link');
  const max = parseNumberValue(maxNode, diagnostics, 'roki::link');
  const stiffness = parseNumberValue(stiffnessNode, diagnostics, 'roki::link');
  const viscosity = parseNumberValue(viscosityNode, diagnostics, 'roki::link');
  const coulomb = parseNumberValue(coulombNode, diagnostics, 'roki::link');
  const staticFriction = parseNumberValue(staticFrictionNode, diagnostics, 'roki::link');
  const breakValues = parseNumberList(breakNode, diagnostics, 'roki::link');
  const forceThreshold = parseNumberValue(forceThresholdNode, diagnostics, 'roki::link');
  const torqueThreshold = parseNumberValue(torqueThresholdNode, diagnostics, 'roki::link');
  const motorName = parseText(motorNode);

  return {
    tag: 'roki::link',
    section,
    name: parseText(nameNode),
    jointType,
    joint: parseJointSpec(
      jointType,
      {
        dis,
        breakValues,
        min,
        max,
        stiffness,
        viscosity,
        coulomb,
        staticFriction,
        forceThreshold,
        torqueThreshold,
        motorName,
      },
      diagnostics,
      'roki::link',
    ),
    mass,
    density,
    stuff,
    com,
    inertia,
    massProperties: {
      mass,
      density,
      stuff,
      com,
      inertia,
    },
    transform: parseTransform(section, entries, used, diagnostics, 'roki::link'),
    dis,
    breakValues,
    min,
    max,
    stiffness,
    viscosity,
    coulomb,
    staticFriction,
    forceThreshold,
    torqueThreshold,
    motorName,
    shapeNames: shapeNodes
      .map((node) => parseText(node))
      .filter((value): value is string => value !== undefined),
    parentName: parseText(parentNode),
    bindName: parseText(bindNode),
    shapes: [],
    children: [],
    unknownKeys: unknownKeys(section, used),
  };
}

function parseOptic(section: ZtkSection, diagnostics: ZtkDiagnostic[]): ZtkOptic {
  const entries = createEntries(section);
  const used = new Set<ZtkKeyValueNode>();

  const nameNode = first(entries, 'name');
  const ambientNode = first(entries, 'ambient');
  const diffuseNode = first(entries, 'diffuse');
  const specularNode = first(entries, 'specular');
  const esrNode = first(entries, 'esr');
  const shininessNode = first(entries, 'shininess');
  const alphaNode = first(entries, 'alpha');

  markUsed(used, [
    nameNode,
    ambientNode,
    diffuseNode,
    specularNode,
    esrNode,
    shininessNode,
    alphaNode,
  ]);

  return {
    tag: 'zeo::optic',
    section,
    name: parseText(nameNode),
    ambient: parseVec3(ambientNode, diagnostics, 'zeo::optic'),
    diffuse: parseVec3(diffuseNode, diagnostics, 'zeo::optic'),
    specular: parseVec3(specularNode, diagnostics, 'zeo::optic'),
    esr: parseNumberValue(esrNode, diagnostics, 'zeo::optic'),
    shininess: parseNumberValue(shininessNode, diagnostics, 'zeo::optic'),
    alpha: parseNumberValue(alphaNode, diagnostics, 'zeo::optic'),
    unknownKeys: unknownKeys(section, used),
  };
}

function parseTextureCoord(
  node: ZtkKeyValueNode,
  diagnostics: ZtkDiagnostic[],
  tag: string | null,
): ZtkTextureCoord | undefined {
  const values = parseNumberList(node, diagnostics, tag);
  if (!values) {
    return undefined;
  }
  if (values.length < 3) {
    diagnostics.push({
      code: 'invalid-arity',
      message: `Expected 3 numbers but got ${values.length}`,
      tag,
      key: node.key,
    });
    return undefined;
  }
  return {
    index: values[0],
    uv: [values[1], values[2]],
  };
}

function parseTextureFace(
  node: ZtkKeyValueNode,
  diagnostics: ZtkDiagnostic[],
  tag: string | null,
): ZtkTextureFace | undefined {
  const values = parseNumberList(node, diagnostics, tag);
  if (!values) {
    return undefined;
  }
  if (values.length < 3) {
    diagnostics.push({
      code: 'invalid-arity',
      message: `Expected 3 numbers but got ${values.length}`,
      tag,
      key: node.key,
    });
    return undefined;
  }
  return {
    indices: [values[0], values[1], values[2]],
  };
}

function parseTexture(section: ZtkSection, diagnostics: ZtkDiagnostic[]): ZtkTexture {
  const entries = createEntries(section);
  const used = new Set<ZtkKeyValueNode>();

  const nameNode = first(entries, 'name');
  const fileNode = first(entries, 'file');
  const typeNode = first(entries, 'type');
  const depthNode = first(entries, 'depth');
  const coordNodes = all(entries, 'coord');
  const faceNodes = all(entries, 'face');

  markUsed(used, [nameNode, fileNode, typeNode, depthNode]);
  markUsed(used, coordNodes);
  markUsed(used, faceNodes);

  return {
    tag: 'zeo::texture',
    section,
    name: parseText(nameNode),
    file: parseText(fileNode),
    type: parseText(typeNode),
    depth: parseNumberValue(depthNode, diagnostics, 'zeo::texture'),
    coords: coordNodes
      .map((node) => parseTextureCoord(node, diagnostics, 'zeo::texture'))
      .filter((value): value is ZtkTextureCoord => value !== undefined),
    faces: faceNodes
      .map((node) => parseTextureFace(node, diagnostics, 'zeo::texture'))
      .filter((value): value is ZtkTextureFace => value !== undefined),
    unknownKeys: unknownKeys(section, used),
  };
}

function parseImport(
  node: ZtkKeyValueNode | undefined,
  diagnostics: ZtkDiagnostic[],
  tag: string | null,
): { name?: string; scale?: number } {
  if (!node) {
    return {};
  }

  const [name, scaleToken] = node.values;
  if (!name) {
    return {};
  }
  if (!scaleToken) {
    return { name };
  }

  const scale = Number(scaleToken);
  if (!Number.isFinite(scale)) {
    diagnostics.push({
      code: 'invalid-number',
      message: `Could not parse number "${scaleToken}"`,
      tag,
      key: node.key,
    });
    return { name };
  }
  return { name, scale };
}

function parseShapeGeometry(
  type: string | undefined,
  entries: Map<string, ZtkKeyValueNode[]>,
  used: Set<ZtkKeyValueNode>,
  diagnostics: ZtkDiagnostic[],
): ZtkShapeGeometry {
  switch (type) {
    case 'box': {
      const centerNode = first(entries, 'center');
      const axNode = first(entries, 'ax');
      const ayNode = first(entries, 'ay');
      const azNode = first(entries, 'az');
      const depthNode = first(entries, 'depth');
      const widthNode = first(entries, 'width');
      const heightNode = first(entries, 'height');
      markUsed(used, [centerNode, axNode, ayNode, azNode, depthNode, widthNode, heightNode]);
      return {
        type,
        center: parseVec3(centerNode, diagnostics, 'zeo::shape'),
        ax: parseAxis(axNode, diagnostics, 'zeo::shape'),
        ay: parseAxis(ayNode, diagnostics, 'zeo::shape'),
        az: parseAxis(azNode, diagnostics, 'zeo::shape'),
        depth: parseNumberValue(depthNode, diagnostics, 'zeo::shape'),
        width: parseNumberValue(widthNode, diagnostics, 'zeo::shape'),
        height: parseNumberValue(heightNode, diagnostics, 'zeo::shape'),
      };
    }
    case 'sphere': {
      const centerNodes = all(entries, 'center');
      const radiusNodes = all(entries, 'radius');
      const divNode = first(entries, 'div');
      const centerNode = centerNodes[0];
      const radiusNode = radiusNodes[0];
      markUsed(used, centerNodes);
      markUsed(used, radiusNodes);
      markUsed(used, divNode);
      return {
        type,
        center: parseVec3(centerNode, diagnostics, 'zeo::shape'),
        radius: parseNumberValue(radiusNode, diagnostics, 'zeo::shape'),
        div: parseNumberValue(divNode, diagnostics, 'zeo::shape'),
      };
    }
    case 'cylinder': {
      const allCenterNodes = all(entries, 'center');
      const centerNodes = take(entries, 'center', 2);
      const radiusNodes = all(entries, 'radius');
      const divNode = first(entries, 'div');
      const radiusNode = radiusNodes[0];
      markUsed(used, allCenterNodes);
      markUsed(used, radiusNodes);
      markUsed(used, divNode);
      return {
        type,
        centers: centerNodes
          .map((node) => parseVec3(node, diagnostics, 'zeo::shape'))
          .filter((value): value is ZtkVec3 => value !== undefined),
        radius: parseNumberValue(radiusNode, diagnostics, 'zeo::shape'),
        div: parseNumberValue(divNode, diagnostics, 'zeo::shape'),
      };
    }
    case 'cone': {
      const centerNodes = all(entries, 'center');
      const vertNodes = all(entries, 'vert');
      const radiusNodes = all(entries, 'radius');
      const divNode = first(entries, 'div');
      const centerNode = centerNodes[0];
      const vertNode = vertNodes[0];
      const radiusNode = radiusNodes[0];
      markUsed(used, centerNodes);
      markUsed(used, vertNodes);
      markUsed(used, radiusNodes);
      markUsed(used, divNode);
      return {
        type,
        center: parseVec3(centerNode, diagnostics, 'zeo::shape'),
        vert: parseVec3(vertNode, diagnostics, 'zeo::shape'),
        radius: parseNumberValue(radiusNode, diagnostics, 'zeo::shape'),
        div: parseNumberValue(divNode, diagnostics, 'zeo::shape'),
      };
    }
    case 'capsule': {
      const allCenterNodes = all(entries, 'center');
      const centerNodes = take(entries, 'center', 2);
      const radiusNodes = all(entries, 'radius');
      const divNode = first(entries, 'div');
      const radiusNode = radiusNodes[0];
      markUsed(used, allCenterNodes);
      markUsed(used, radiusNodes);
      markUsed(used, divNode);
      return {
        type,
        centers: centerNodes
          .map((node) => parseVec3(node, diagnostics, 'zeo::shape'))
          .filter((value): value is ZtkVec3 => value !== undefined),
        radius: parseNumberValue(radiusNode, diagnostics, 'zeo::shape'),
        div: parseNumberValue(divNode, diagnostics, 'zeo::shape'),
      };
    }
    case 'ellipsoid': {
      const centerNode = first(entries, 'center');
      const axNode = first(entries, 'ax');
      const ayNode = first(entries, 'ay');
      const azNode = first(entries, 'az');
      const rxNode = first(entries, 'rx');
      const ryNode = first(entries, 'ry');
      const rzNode = first(entries, 'rz');
      const divNode = first(entries, 'div');
      markUsed(used, [centerNode, axNode, ayNode, azNode, rxNode, ryNode, rzNode, divNode]);
      return {
        type,
        center: parseVec3(centerNode, diagnostics, 'zeo::shape'),
        ax: parseAxis(axNode, diagnostics, 'zeo::shape'),
        ay: parseAxis(ayNode, diagnostics, 'zeo::shape'),
        az: parseAxis(azNode, diagnostics, 'zeo::shape'),
        rx: parseNumberValue(rxNode, diagnostics, 'zeo::shape'),
        ry: parseNumberValue(ryNode, diagnostics, 'zeo::shape'),
        rz: parseNumberValue(rzNode, diagnostics, 'zeo::shape'),
        div: parseNumberValue(divNode, diagnostics, 'zeo::shape'),
      };
    }
    case 'ellipticcylinder': {
      const centerNodes = all(entries, 'center');
      const radiusNodes = all(entries, 'radius');
      const refNode = first(entries, 'ref');
      const divNode = first(entries, 'div');
      markUsed(used, centerNodes);
      markUsed(used, radiusNodes);
      markUsed(used, [refNode, divNode]);
      return {
        type,
        centers: centerNodes
          .map((node) => parseVec3(node, diagnostics, 'zeo::shape'))
          .filter((value): value is ZtkVec3 => value !== undefined),
        radii: radiusNodes
          .map((node) => parseNumberValue(node, diagnostics, 'zeo::shape'))
          .filter((value): value is number => value !== undefined),
        ref: parseVec3(refNode, diagnostics, 'zeo::shape'),
        div: parseNumberValue(divNode, diagnostics, 'zeo::shape'),
      };
    }
    case 'polyhedron': {
      const vertNodes = all(entries, 'vert');
      const faceNodes = all(entries, 'face');
      const loopNodes = all(entries, 'loop');
      const prismNodes = all(entries, 'prism');
      const pyramidNodes = all(entries, 'pyramid');
      markUsed(used, vertNodes);
      markUsed(used, faceNodes);
      markUsed(used, loopNodes);
      markUsed(used, prismNodes);
      markUsed(used, pyramidNodes);
      return {
        type,
        vertices: vertNodes
          .map((node) => parseNumberList(node, diagnostics, 'zeo::shape'))
          .filter((value): value is number[] => value !== undefined),
        faces: faceNodes
          .map((node) => parseNumberList(node, diagnostics, 'zeo::shape'))
          .filter((value): value is number[] => value !== undefined),
        loops: loopNodes
          .filter((node) => isNumericTokenList(node.values))
          .map((node) => parseNumberList(node, diagnostics, 'zeo::shape'))
          .filter((value): value is number[] => value !== undefined),
        proceduralLoops: loopNodes
          .filter((node) => !isNumericTokenList(node.values))
          .map((node) => [...node.values]),
        prisms: prismNodes
          .map((node) => parseNumberList(node, diagnostics, 'zeo::shape'))
          .filter((value): value is number[] => value !== undefined),
        pyramids: pyramidNodes
          .map((node) => parseNumberList(node, diagnostics, 'zeo::shape'))
          .filter((value): value is number[] => value !== undefined),
      };
    }
    case 'nurbs': {
      const dimNodes = all(entries, 'dim');
      const uknotNodes = all(entries, 'uknot');
      const vknotNodes = all(entries, 'vknot');
      const sizeNodes = all(entries, 'size');
      const cpNodes = all(entries, 'cp');
      const sliceNodes = all(entries, 'slice');
      markUsed(used, dimNodes);
      markUsed(used, uknotNodes);
      markUsed(used, vknotNodes);
      markUsed(used, sizeNodes);
      markUsed(used, cpNodes);
      markUsed(used, sliceNodes);
      return {
        type,
        dim: dimNodes
          .map((node) => parseNumberList(node, diagnostics, 'zeo::shape'))
          .filter((value): value is number[] => value !== undefined)
          .flat(),
        uKnots: uknotNodes
          .map((node) => parseNumberList(node, diagnostics, 'zeo::shape'))
          .filter((value): value is number[] => value !== undefined),
        vKnots: vknotNodes
          .map((node) => parseNumberList(node, diagnostics, 'zeo::shape'))
          .filter((value): value is number[] => value !== undefined),
        sizes: sizeNodes
          .map((node) => parseNumberList(node, diagnostics, 'zeo::shape'))
          .filter((value): value is number[] => value !== undefined),
        controlPoints: cpNodes
          .map((node) => parseNumberList(node, diagnostics, 'zeo::shape'))
          .filter((value): value is number[] => value !== undefined),
        slices: sliceNodes
          .map((node) => parseNumberList(node, diagnostics, 'zeo::shape'))
          .filter((value): value is number[] => value !== undefined),
      };
    }
    default:
      return { type: type ?? '' };
  }
}

function parseShape(section: ZtkSection, diagnostics: ZtkDiagnostic[]): ZtkShape {
  const entries = createEntries(section);
  const used = new Set<ZtkKeyValueNode>();

  const nameNode = first(entries, 'name');
  const typeNode = first(entries, 'type');
  const opticNode = first(entries, 'optic');
  const textureNode = first(entries, 'texture');
  const mirrorNode = first(entries, 'mirror');
  const importNode = first(entries, 'import');
  const parsedImport = parseImport(importNode, diagnostics, 'zeo::shape');

  markUsed(used, [nameNode, typeNode, opticNode, textureNode, mirrorNode, importNode]);

  const type = parseText(typeNode);
  const mirrorName = mirrorNode?.values[0];
  const mirrorAxis = mirrorNode?.values[1];

  return {
    tag: 'zeo::shape',
    section,
    name: parseText(nameNode),
    type,
    opticName: parseText(opticNode),
    textureName: parseText(textureNode),
    texture: undefined,
    mirrorName,
    mirrorAxis,
    importName: parsedImport.name,
    importScale: parsedImport.scale,
    mirror: undefined,
    transform: parseTransform(section, entries, used, diagnostics, 'zeo::shape'),
    geometry: parseShapeGeometry(type, entries, used, diagnostics),
    unknownKeys: unknownKeys(section, used),
  };
}

function parseMapTerraGrid(
  node: ZtkKeyValueNode,
  diagnostics: ZtkDiagnostic[],
  tag: string | null,
): ZtkMapTerraGrid | undefined {
  const values = parseNumberList(node, diagnostics, tag);
  if (!values) {
    return undefined;
  }
  if (values.length < 8) {
    diagnostics.push({
      code: 'invalid-arity',
      message: `Expected 8 numbers but got ${values.length}`,
      tag,
      key: node.key,
    });
    return undefined;
  }
  return {
    index: [values[0], values[1]],
    z: values[2],
    normal: [values[3], values[4], values[5]],
    variance: values[6],
    traversable: values[7] !== 0,
  };
}

function parsePair(
  node: ZtkKeyValueNode | undefined,
  diagnostics: ZtkDiagnostic[],
  tag: string | null,
): [number, number] | undefined {
  const value = parseVec2(node, diagnostics, tag);
  return value ? [value[0], value[1]] : undefined;
}

function parseMap(section: ZtkSection, diagnostics: ZtkDiagnostic[]): ZtkMap {
  const entries = createEntries(section);
  const used = new Set<ZtkKeyValueNode>();
  const nameNode = first(entries, 'name');
  const typeNode = first(entries, 'type');
  const originNode = first(entries, 'origin');
  const resolutionNode = first(entries, 'resolution');
  const sizeNode = first(entries, 'size');
  const zrangeNode = first(entries, 'zrange');
  const thVarNode = first(entries, 'th_var');
  const thGridNode = first(entries, 'th_grd');
  const thResNode = first(entries, 'th_res');
  const gridNodes = all(entries, 'grid');
  const type = parseText(typeNode);

  markUsed(used, [nameNode, typeNode, originNode, resolutionNode, sizeNode, zrangeNode]);
  markUsed(used, [thVarNode, thGridNode, thResNode]);
  markUsed(used, gridNodes);

  return {
    tag: 'zeo::map',
    section,
    name: parseText(nameNode),
    type,
    terra:
      type === 'terra'
        ? {
            origin: parsePair(originNode, diagnostics, 'zeo::map'),
            resolution: parsePair(resolutionNode, diagnostics, 'zeo::map'),
            size: parsePair(sizeNode, diagnostics, 'zeo::map'),
            zrange: parsePair(zrangeNode, diagnostics, 'zeo::map'),
            thVar: parseNumberValue(thVarNode, diagnostics, 'zeo::map'),
            thGrid: parseNumberValue(thGridNode, diagnostics, 'zeo::map'),
            thRes: parseNumberValue(thResNode, diagnostics, 'zeo::map'),
            grids: gridNodes
              .map((node) => parseMapTerraGrid(node, diagnostics, 'zeo::map'))
              .filter((value): value is ZtkMapTerraGrid => value !== undefined),
          }
        : undefined,
    unknownKeys: unknownKeys(section, used),
  };
}

function indexByName<T extends { name?: string; tag: string }>(
  values: T[],
  diagnostics: ZtkDiagnostic[],
): Map<string, T> {
  const map = new Map<string, T>();
  for (const value of values) {
    if (!value.name) {
      continue;
    }
    if (map.has(value.name)) {
      diagnostics.push({
        code: 'duplicate-name',
        message: `Duplicate ${value.tag} name "${value.name}"`,
        tag: value.tag,
        key: 'name',
      });
      continue;
    }
    map.set(value.name, value);
  }
  return map;
}

function resolveLinks(
  links: ZtkLink[],
  shapes: ZtkShape[],
  motors: ZtkMotor[],
  diagnostics: ZtkDiagnostic[],
): void {
  const shapeMap = indexByName(shapes, diagnostics);
  const motorMap = indexByName(motors, diagnostics);
  const linkMap = indexByName(links, diagnostics);

  for (const link of links) {
    link.shapes = [];
    link.children = [];
  }

  for (const link of links) {
    if (link.motorName) {
      link.motor = motorMap.get(link.motorName);
      link.joint.motor = link.motor;
      if (!link.motor) {
        diagnostics.push({
          code: 'unresolved-reference',
          message: `Link "${link.name ?? '(unnamed)'}" references missing motor "${link.motorName}"`,
          tag: link.tag,
          key: 'motor',
        });
      }
    }

    for (const shapeName of link.shapeNames) {
      const shape = shapeMap.get(shapeName);
      if (!shape) {
        diagnostics.push({
          code: 'unresolved-reference',
          message: `Link "${link.name ?? '(unnamed)'}" references missing shape "${shapeName}"`,
          tag: link.tag,
          key: 'shape',
        });
        continue;
      }
      link.shapes.push(shape);
    }

    if (link.parentName) {
      link.parent = linkMap.get(link.parentName);
      if (!link.parent) {
        diagnostics.push({
          code: 'unresolved-reference',
          message: `Link "${link.name ?? '(unnamed)'}" references missing parent "${link.parentName}"`,
          tag: link.tag,
          key: 'parent',
        });
      } else {
        link.parent.children.push(link);
      }
    }

    if (link.bindName) {
      link.bind = linkMap.get(link.bindName);
      if (!link.bind) {
        diagnostics.push({
          code: 'unresolved-reference',
          message: `Link "${link.name ?? '(unnamed)'}" references missing bind "${link.bindName}"`,
          tag: link.tag,
          key: 'bind',
        });
      }
    }
  }
}

function resolveChainInit(
  chainInit: ZtkChainInit | undefined,
  links: ZtkLink[],
  diagnostics: ZtkDiagnostic[],
): void {
  if (!chainInit) {
    return;
  }

  const linkMap = indexByName(links, diagnostics);
  for (const jointState of chainInit.jointStates) {
    if (!jointState.linkName) {
      continue;
    }

    jointState.link = linkMap.get(jointState.linkName);
    if (!jointState.link) {
      diagnostics.push({
        code: 'unresolved-reference',
        message: `Chain init references missing link "${jointState.linkName}"`,
        tag: 'roki::chain::init',
        key: 'joint',
      });
    }
  }
}

function resolveChainIk(
  chainIk: ZtkChainIk | undefined,
  links: ZtkLink[],
  diagnostics: ZtkDiagnostic[],
): void {
  if (!chainIk) {
    return;
  }

  const linkMap = indexByName(links, diagnostics);
  for (const joint of chainIk.joints) {
    if (joint.selector === 'all') {
      continue;
    }
    joint.link = linkMap.get(joint.selector);
    if (!joint.link) {
      diagnostics.push({
        code: 'unresolved-reference',
        message: `Chain IK references missing link "${joint.selector}"`,
        tag: 'roki::chain::ik',
        key: 'joint',
      });
    }
  }

  for (const constraint of chainIk.constraints) {
    constraint.links = [];
    for (const linkName of constraint.linkNames) {
      const link = linkMap.get(linkName);
      if (!link) {
        diagnostics.push({
          code: 'unresolved-reference',
          message: `Chain IK constraint "${constraint.name ?? '(unnamed)'}" references missing link "${linkName}"`,
          tag: 'roki::chain::ik',
          key: 'constraint',
        });
        continue;
      }
      constraint.links.push(link);
    }
  }
}

function resolveShapes(
  shapes: ZtkShape[],
  optics: ZtkOptic[],
  textures: ZtkTexture[],
  diagnostics: ZtkDiagnostic[],
): void {
  const opticMap = indexByName(optics, diagnostics);
  const textureMap = indexByName(textures, diagnostics);
  const shapeMap = indexByName(shapes, diagnostics);
  for (const shape of shapes) {
    if (shape.opticName) {
      shape.optic = opticMap.get(shape.opticName);
      if (!shape.optic) {
        diagnostics.push({
          code: 'unresolved-reference',
          message: `Shape "${shape.name ?? '(unnamed)'}" references missing optic "${shape.opticName}"`,
          tag: shape.tag,
          key: 'optic',
        });
      }
    }

    if (shape.textureName) {
      shape.texture = textureMap.get(shape.textureName);
      if (!shape.texture) {
        diagnostics.push({
          code: 'unresolved-reference',
          message: `Shape "${shape.name ?? '(unnamed)'}" references missing texture "${shape.textureName}"`,
          tag: shape.tag,
          key: 'texture',
        });
      }
    }

    if (shape.mirrorName) {
      shape.mirror = shapeMap.get(shape.mirrorName);
      if (!shape.mirror) {
        diagnostics.push({
          code: 'unresolved-reference',
          message: `Shape "${shape.name ?? '(unnamed)'}" references missing mirror source "${shape.mirrorName}"`,
          tag: shape.tag,
          key: 'mirror',
        });
      }
    }
  }
}

export function resolveZtk(document: ZtkDocument): ZtkSemanticDocument {
  const diagnostics: ZtkDiagnostic[] = [];
  const model: ZtkSemanticDocument = {
    source: document,
    motors: [],
    contacts: [],
    links: [],
    optics: [],
    textures: [],
    shapes: [],
    maps: [],
    unknownSections: [],
    diagnostics,
  };

  for (const section of getSections(document)) {
    const tag = section.tag?.name ?? null;
    switch (tag) {
      case 'roki::chain':
        model.chain = parseChain(section, diagnostics);
        break;
      case 'roki::chain::init':
        model.chainInit = parseChainInit(section, diagnostics);
        break;
      case 'roki::chain::ik':
        model.chainIk = parseChainIk(section, diagnostics);
        break;
      case 'roki::motor':
        model.motors.push(parseMotor(section, diagnostics));
        break;
      case 'roki::contact':
        model.contacts.push(parseContact(section, diagnostics));
        break;
      case 'roki::link':
        model.links.push(parseLink(section, diagnostics));
        break;
      case 'zeo::optic':
        model.optics.push(parseOptic(section, diagnostics));
        break;
      case 'zeo::texture':
        model.textures.push(parseTexture(section, diagnostics));
        break;
      case 'zeo::shape':
        model.shapes.push(parseShape(section, diagnostics));
        break;
      case 'zeo::map':
        model.maps.push(parseMap(section, diagnostics));
        break;
      default:
        model.unknownSections.push(section);
        break;
    }
  }

  resolveShapes(model.shapes, model.optics, model.textures, diagnostics);
  resolveLinks(model.links, model.shapes, model.motors, diagnostics);
  resolveChainInit(model.chainInit, model.links, diagnostics);
  resolveChainIk(model.chainIk, model.links, diagnostics);

  return model;
}
