import { getSections, type ZtkDocument, type ZtkKeyValueNode, type ZtkSection } from './ast.js';

export type ZtkDiagnostic = {
  code: string;
  message: string;
  tag: string | null;
  key?: string;
};

export type ZtkVec3 = [number, number, number];
export type ZtkMat3 = [number, number, number, number, number, number, number, number, number];
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
  com?: ZtkVec3;
  inertia?: ZtkMat3;
  massProperties: ZtkMassProperties;
  transform: ZtkTransform;
  dis?: number[];
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
  com?: ZtkVec3;
  inertia?: ZtkMat3;
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
      prisms: number[][];
      pyramids: number[][];
    }
  | {
      type: 'nurbs';
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
  mirrorName?: string;
  importName?: string;
  optic?: ZtkOptic;
  transform: ZtkTransform;
  geometry: ZtkShapeGeometry;
  unknownKeys: ZtkKeyValueNode[];
};

export type ZtkSemanticDocument = {
  source: ZtkDocument;
  chain?: ZtkChain;
  chainInit?: ZtkChainInit;
  motors: ZtkMotor[];
  links: ZtkLink[];
  optics: ZtkOptic[];
  shapes: ZtkShape[];
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
  raw: Pick<ZtkTransform, 'pos' | 'att' | 'frame' | 'rotations' | 'dh'>,
  diagnostics: ZtkDiagnostic[],
  tag: string | null,
): ZtkResolvedTransform {
  if (raw.frame) {
    if (raw.pos || raw.att || raw.rotations.length > 0 || raw.dh) {
      diagnostics.push({
        code: 'conflicting-transform',
        message: 'frame takes precedence over pos/att/rot/DH in semantic resolution',
        tag,
      });
    }
    return createResolvedFromFrame(raw.frame);
  }

  if (raw.pos || raw.att) {
    if (raw.rotations.length > 0 || raw.dh) {
      diagnostics.push({
        code: 'conflicting-transform',
        message: 'pos/att takes precedence over rot/DH in semantic resolution',
        tag,
      });
    }
    return createResolvedFromPosAtt(raw.pos, raw.att);
  }

  if (raw.rotations.length > 0 || raw.dh) {
    diagnostics.push({
      code: 'unsupported-transform',
      message: 'rot and DH are preserved but not yet resolved into an effective frame',
      tag,
    });

    const identity = createIdentityTransform();
    return {
      mode: 'procedural',
      pos: identity.pos,
      att: identity.att,
      frame: identity.frame,
    };
  }

  return createIdentityTransform();
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
  entries: Map<string, ZtkKeyValueNode[]>,
  used: Set<ZtkKeyValueNode>,
  diagnostics: ZtkDiagnostic[],
  tag: string | null,
): ZtkTransform {
  const posNode = first(entries, 'pos');
  const attNode = first(entries, 'att');
  const frameNode = first(entries, 'frame');
  const dhNode = first(entries, 'DH');
  const rotNodes = all(entries, 'rot');

  markUsed(used, posNode);
  markUsed(used, attNode);
  markUsed(used, frameNode);
  markUsed(used, dhNode);
  markUsed(used, rotNodes);

  const rawTransform = {
    pos: parseVec3(posNode, diagnostics, tag),
    att: parseMat3(attNode, diagnostics, tag),
    frame: parseMat3x4(frameNode, diagnostics, tag),
    rotations: rotNodes.map((node) => [...node.values]),
    dh: parseNumberList(dhNode, diagnostics, tag),
  };

  return {
    ...rawTransform,
    resolved: resolveTransform(rawTransform, diagnostics, tag),
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

  return {
    tag: 'roki::chain::init',
    section,
    transform: parseTransform(entries, used, diagnostics, 'roki::chain::init'),
    joints: jointStates.map((jointState) => jointState.values),
    jointStates,
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
  const viscosityNode = first(entries, 'viscosity');
  const coulombNode = first(entries, 'coulomb');
  const staticFrictionNode = first(entries, 'staticfriction');
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
  const com = parseVec3(comNode, diagnostics, 'roki::link');
  const inertia = parseMat3(inertiaNode, diagnostics, 'roki::link');
  const dis = parseNumberList(disNode, diagnostics, 'roki::link');
  const min = parseNumberValue(minNode, diagnostics, 'roki::link');
  const max = parseNumberValue(maxNode, diagnostics, 'roki::link');
  const stiffness = parseNumberValue(stiffnessNode, diagnostics, 'roki::link');
  const viscosity = parseNumberValue(viscosityNode, diagnostics, 'roki::link');
  const coulomb = parseNumberValue(coulombNode, diagnostics, 'roki::link');
  const staticFriction = parseNumberValue(staticFrictionNode, diagnostics, 'roki::link');
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
    transform: parseTransform(entries, used, diagnostics, 'roki::link'),
    dis,
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
      const centerNode = first(entries, 'center');
      const radiusNode = first(entries, 'radius');
      const divNode = first(entries, 'div');
      markUsed(used, [centerNode, radiusNode, divNode]);
      return {
        type,
        center: parseVec3(centerNode, diagnostics, 'zeo::shape'),
        radius: parseNumberValue(radiusNode, diagnostics, 'zeo::shape'),
        div: parseNumberValue(divNode, diagnostics, 'zeo::shape'),
      };
    }
    case 'cylinder': {
      const centerNodes = all(entries, 'center');
      const radiusNode = first(entries, 'radius');
      const divNode = first(entries, 'div');
      markUsed(used, centerNodes);
      markUsed(used, [radiusNode, divNode]);
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
      const centerNode = first(entries, 'center');
      const vertNode = first(entries, 'vert');
      const radiusNode = first(entries, 'radius');
      const divNode = first(entries, 'div');
      markUsed(used, [centerNode, vertNode, radiusNode, divNode]);
      return {
        type,
        center: parseVec3(centerNode, diagnostics, 'zeo::shape'),
        vert: parseVec3(vertNode, diagnostics, 'zeo::shape'),
        radius: parseNumberValue(radiusNode, diagnostics, 'zeo::shape'),
        div: parseNumberValue(divNode, diagnostics, 'zeo::shape'),
      };
    }
    case 'capsule': {
      const centerNodes = all(entries, 'center');
      const radiusNode = first(entries, 'radius');
      const divNode = first(entries, 'div');
      markUsed(used, centerNodes);
      markUsed(used, [radiusNode, divNode]);
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
          .map((node) => parseNumberList(node, diagnostics, 'zeo::shape'))
          .filter((value): value is number[] => value !== undefined),
        prisms: prismNodes
          .map((node) => parseNumberList(node, diagnostics, 'zeo::shape'))
          .filter((value): value is number[] => value !== undefined),
        pyramids: pyramidNodes
          .map((node) => parseNumberList(node, diagnostics, 'zeo::shape'))
          .filter((value): value is number[] => value !== undefined),
      };
    }
    case 'nurbs': {
      const uknotNodes = all(entries, 'uknot');
      const vknotNodes = all(entries, 'vknot');
      const sizeNodes = all(entries, 'size');
      const cpNodes = all(entries, 'cp');
      const sliceNodes = all(entries, 'slice');
      markUsed(used, uknotNodes);
      markUsed(used, vknotNodes);
      markUsed(used, sizeNodes);
      markUsed(used, cpNodes);
      markUsed(used, sliceNodes);
      return {
        type,
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

  markUsed(used, [nameNode, typeNode, opticNode, textureNode, mirrorNode, importNode]);

  const type = parseText(typeNode);

  return {
    tag: 'zeo::shape',
    section,
    name: parseText(nameNode),
    type,
    opticName: parseText(opticNode),
    textureName: parseText(textureNode),
    mirrorName: parseText(mirrorNode),
    importName: parseText(importNode),
    transform: parseTransform(entries, used, diagnostics, 'zeo::shape'),
    geometry: parseShapeGeometry(type, entries, used, diagnostics),
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

function resolveShapes(shapes: ZtkShape[], optics: ZtkOptic[], diagnostics: ZtkDiagnostic[]): void {
  const opticMap = indexByName(optics, diagnostics);
  for (const shape of shapes) {
    if (!shape.opticName) {
      continue;
    }
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
}

export function resolveZtk(document: ZtkDocument): ZtkSemanticDocument {
  const diagnostics: ZtkDiagnostic[] = [];
  const model: ZtkSemanticDocument = {
    source: document,
    motors: [],
    links: [],
    optics: [],
    shapes: [],
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
      case 'roki::motor':
        model.motors.push(parseMotor(section, diagnostics));
        break;
      case 'roki::link':
        model.links.push(parseLink(section, diagnostics));
        break;
      case 'zeo::optic':
        model.optics.push(parseOptic(section, diagnostics));
        break;
      case 'zeo::shape':
        model.shapes.push(parseShape(section, diagnostics));
        break;
      default:
        model.unknownSections.push(section);
        break;
    }
  }

  resolveShapes(model.shapes, model.optics, diagnostics);
  resolveLinks(model.links, model.shapes, model.motors, diagnostics);
  resolveChainInit(model.chainInit, model.links, diagnostics);

  return model;
}
