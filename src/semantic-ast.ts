import { createDocument, type ZtkDocument, type ZtkKeyValueNode, type ZtkNode } from './ast.js';
import type {
  ZtkChain,
  ZtkChainInit,
  ZtkChainInitJointState,
  ZtkLink,
  ZtkMat3,
  ZtkMat3x4,
  ZtkMotor,
  ZtkOptic,
  ZtkSemanticDocument,
  ZtkShape,
  ZtkShapeGeometry,
  ZtkTransform,
  ZtkVec3,
} from './semantic.js';
import { tokenizeValue } from './tokenize.js';

function cloneKeyValueNode(node: ZtkKeyValueNode): ZtkKeyValueNode {
  return {
    type: 'keyValue',
    rawLines: [...node.rawLines],
    key: node.key,
    rawValue: node.rawValue,
    values: [...node.values],
  };
}

function createTagNode(name: string): ZtkNode {
  return {
    type: 'tag',
    raw: `[${name}]`,
    name,
  };
}

function createKeyValueNode(key: string, rawValue: string): ZtkKeyValueNode {
  const lines = rawValue.split('\n');
  const rawLines =
    lines.length === 0 ? [`${key}:`] : [`${key}: ${lines[0] ?? ''}`, ...lines.slice(1)];

  return {
    type: 'keyValue',
    rawLines,
    key,
    rawValue,
    values: tokenizeValue(rawValue),
  };
}

function formatNumber(value: number): string {
  return `${value}`;
}

function formatVec3(value: ZtkVec3): string {
  return `{ ${value.map(formatNumber).join(', ')} }`;
}

function formatMat3(value: ZtkMat3): string {
  return `{\n${value.slice(0, 3).join(', ')}\n${value.slice(3, 6).join(', ')}\n${value
    .slice(6, 9)
    .join(', ')}\n}`;
}

function formatMat3x4(value: ZtkMat3x4): string {
  return `{\n${value.slice(0, 4).join(', ')}\n${value.slice(4, 8).join(', ')}\n${value
    .slice(8, 12)
    .join(', ')}\n}`;
}

function formatNumberList(values: number[]): string {
  return values.join(' ');
}

function pushKeyValue(nodes: ZtkNode[], key: string, rawValue: string | undefined): void {
  if (rawValue !== undefined) {
    nodes.push(createKeyValueNode(key, rawValue));
  }
}

function pushTransform(nodes: ZtkNode[], transform: ZtkTransform): void {
  if (transform.pos) {
    pushKeyValue(nodes, 'pos', formatVec3(transform.pos));
  }
  if (transform.att) {
    pushKeyValue(nodes, 'att', formatMat3(transform.att));
  }
  for (const rotation of transform.rotations) {
    pushKeyValue(nodes, 'rot', rotation.join(' '));
  }
  if (transform.frame) {
    pushKeyValue(nodes, 'frame', formatMat3x4(transform.frame));
  }
  if (transform.dh) {
    pushKeyValue(nodes, 'DH', `{ ${transform.dh.map(formatNumber).join(', ')} }`);
  }
}

function isGeometryType<TType extends ZtkShapeGeometry['type']>(
  geometry: ZtkShapeGeometry,
  type: TType,
): geometry is Extract<ZtkShapeGeometry, { type: TType }> {
  return geometry.type === type;
}

function renderChain(chain: ZtkChain | undefined): ZtkNode[] {
  if (!chain) {
    return [];
  }

  const nodes: ZtkNode[] = [createTagNode(chain.tag)];
  pushKeyValue(nodes, 'name', chain.name);
  nodes.push(...chain.unknownKeys.map(cloneKeyValueNode));
  return nodes;
}

function formatJointState(jointState: ZtkChainInitJointState): string {
  if (jointState.linkName) {
    return [jointState.linkName, ...jointState.values.map(formatNumber)].join(' ');
  }
  return formatNumberList(jointState.values);
}

function renderChainInit(chainInit: ZtkChainInit | undefined): ZtkNode[] {
  if (!chainInit) {
    return [];
  }

  const nodes: ZtkNode[] = [createTagNode(chainInit.tag)];
  pushTransform(nodes, chainInit.transform);

  if (chainInit.jointStates.length > 0) {
    for (const jointState of chainInit.jointStates) {
      pushKeyValue(nodes, 'joint', formatJointState(jointState));
    }
  } else {
    for (const joint of chainInit.joints) {
      pushKeyValue(nodes, 'joint', formatNumberList(joint));
    }
  }

  nodes.push(...chainInit.unknownKeys.map(cloneKeyValueNode));
  return nodes;
}

function renderMotor(motor: ZtkMotor): ZtkNode[] {
  const nodes: ZtkNode[] = [createTagNode(motor.tag)];
  pushKeyValue(nodes, 'name', motor.name);
  pushKeyValue(nodes, 'type', motor.type);
  pushKeyValue(nodes, 'min', motor.min !== undefined ? formatNumber(motor.min) : undefined);
  pushKeyValue(nodes, 'max', motor.max !== undefined ? formatNumber(motor.max) : undefined);
  pushKeyValue(
    nodes,
    'motorconstant',
    motor.motorConstant !== undefined ? formatNumber(motor.motorConstant) : undefined,
  );
  pushKeyValue(
    nodes,
    'admittance',
    motor.admittance !== undefined ? formatNumber(motor.admittance) : undefined,
  );
  pushKeyValue(
    nodes,
    'maxvoltage',
    motor.maxVoltage !== undefined ? formatNumber(motor.maxVoltage) : undefined,
  );
  pushKeyValue(
    nodes,
    'minvoltage',
    motor.minVoltage !== undefined ? formatNumber(motor.minVoltage) : undefined,
  );
  pushKeyValue(
    nodes,
    'gearratio',
    motor.gearRatio !== undefined ? formatNumber(motor.gearRatio) : undefined,
  );
  pushKeyValue(
    nodes,
    'rotorinertia',
    motor.rotorInertia !== undefined ? formatNumber(motor.rotorInertia) : undefined,
  );
  pushKeyValue(
    nodes,
    'gearinertia',
    motor.gearInertia !== undefined ? formatNumber(motor.gearInertia) : undefined,
  );
  pushKeyValue(nodes, 'compk', motor.compK !== undefined ? formatNumber(motor.compK) : undefined);
  pushKeyValue(nodes, 'compl', motor.compL !== undefined ? formatNumber(motor.compL) : undefined);
  nodes.push(...motor.unknownKeys.map(cloneKeyValueNode));
  return nodes;
}

function renderOptic(optic: ZtkOptic): ZtkNode[] {
  const nodes: ZtkNode[] = [createTagNode(optic.tag)];
  pushKeyValue(nodes, 'name', optic.name);
  pushKeyValue(nodes, 'ambient', optic.ambient ? formatNumberList(optic.ambient) : undefined);
  pushKeyValue(nodes, 'diffuse', optic.diffuse ? formatNumberList(optic.diffuse) : undefined);
  pushKeyValue(nodes, 'specular', optic.specular ? formatNumberList(optic.specular) : undefined);
  pushKeyValue(nodes, 'esr', optic.esr !== undefined ? formatNumber(optic.esr) : undefined);
  pushKeyValue(
    nodes,
    'shininess',
    optic.shininess !== undefined ? formatNumber(optic.shininess) : undefined,
  );
  pushKeyValue(nodes, 'alpha', optic.alpha !== undefined ? formatNumber(optic.alpha) : undefined);
  nodes.push(...optic.unknownKeys.map(cloneKeyValueNode));
  return nodes;
}

function renderShape(shape: ZtkShape): ZtkNode[] {
  const nodes: ZtkNode[] = [createTagNode(shape.tag)];
  pushKeyValue(nodes, 'name', shape.name);
  pushKeyValue(nodes, 'type', shape.type);
  pushKeyValue(nodes, 'optic', shape.opticName);
  pushKeyValue(nodes, 'texture', shape.textureName);
  pushKeyValue(nodes, 'mirror', shape.mirrorName);
  pushKeyValue(nodes, 'import', shape.importName);
  pushTransform(nodes, shape.transform);
  const geometry = shape.geometry;

  if (isGeometryType(geometry, 'box')) {
    pushKeyValue(nodes, 'center', geometry.center ? formatVec3(geometry.center) : undefined);
    pushKeyValue(
      nodes,
      'ax',
      geometry.ax ? (geometry.ax === 'auto' ? 'auto' : formatNumberList(geometry.ax)) : undefined,
    );
    pushKeyValue(
      nodes,
      'ay',
      geometry.ay ? (geometry.ay === 'auto' ? 'auto' : formatNumberList(geometry.ay)) : undefined,
    );
    pushKeyValue(
      nodes,
      'az',
      geometry.az ? (geometry.az === 'auto' ? 'auto' : formatNumberList(geometry.az)) : undefined,
    );
    pushKeyValue(
      nodes,
      'depth',
      geometry.depth !== undefined ? formatNumber(geometry.depth) : undefined,
    );
    pushKeyValue(
      nodes,
      'width',
      geometry.width !== undefined ? formatNumber(geometry.width) : undefined,
    );
    pushKeyValue(
      nodes,
      'height',
      geometry.height !== undefined ? formatNumber(geometry.height) : undefined,
    );
  } else if (isGeometryType(geometry, 'sphere')) {
    pushKeyValue(nodes, 'center', geometry.center ? formatVec3(geometry.center) : undefined);
    pushKeyValue(
      nodes,
      'radius',
      geometry.radius !== undefined ? formatNumber(geometry.radius) : undefined,
    );
    pushKeyValue(nodes, 'div', geometry.div !== undefined ? formatNumber(geometry.div) : undefined);
  } else if (isGeometryType(geometry, 'cylinder') || isGeometryType(geometry, 'capsule')) {
    for (const center of geometry.centers) {
      pushKeyValue(nodes, 'center', formatVec3(center));
    }
    pushKeyValue(
      nodes,
      'radius',
      geometry.radius !== undefined ? formatNumber(geometry.radius) : undefined,
    );
    pushKeyValue(nodes, 'div', geometry.div !== undefined ? formatNumber(geometry.div) : undefined);
  } else if (isGeometryType(geometry, 'cone')) {
    pushKeyValue(nodes, 'center', geometry.center ? formatVec3(geometry.center) : undefined);
    pushKeyValue(nodes, 'vert', geometry.vert ? formatVec3(geometry.vert) : undefined);
    pushKeyValue(
      nodes,
      'radius',
      geometry.radius !== undefined ? formatNumber(geometry.radius) : undefined,
    );
    pushKeyValue(nodes, 'div', geometry.div !== undefined ? formatNumber(geometry.div) : undefined);
  } else if (isGeometryType(geometry, 'ellipsoid')) {
    pushKeyValue(nodes, 'center', geometry.center ? formatVec3(geometry.center) : undefined);
    pushKeyValue(
      nodes,
      'ax',
      geometry.ax ? (geometry.ax === 'auto' ? 'auto' : formatNumberList(geometry.ax)) : undefined,
    );
    pushKeyValue(
      nodes,
      'ay',
      geometry.ay ? (geometry.ay === 'auto' ? 'auto' : formatNumberList(geometry.ay)) : undefined,
    );
    pushKeyValue(
      nodes,
      'az',
      geometry.az ? (geometry.az === 'auto' ? 'auto' : formatNumberList(geometry.az)) : undefined,
    );
    pushKeyValue(nodes, 'rx', geometry.rx !== undefined ? formatNumber(geometry.rx) : undefined);
    pushKeyValue(nodes, 'ry', geometry.ry !== undefined ? formatNumber(geometry.ry) : undefined);
    pushKeyValue(nodes, 'rz', geometry.rz !== undefined ? formatNumber(geometry.rz) : undefined);
    pushKeyValue(nodes, 'div', geometry.div !== undefined ? formatNumber(geometry.div) : undefined);
  } else if (isGeometryType(geometry, 'ellipticcylinder')) {
    for (const center of geometry.centers) {
      pushKeyValue(nodes, 'center', formatVec3(center));
    }
    for (const radius of geometry.radii) {
      pushKeyValue(nodes, 'radius', formatNumber(radius));
    }
    pushKeyValue(nodes, 'ref', geometry.ref ? formatVec3(geometry.ref) : undefined);
    pushKeyValue(nodes, 'div', geometry.div !== undefined ? formatNumber(geometry.div) : undefined);
  } else if (isGeometryType(geometry, 'polyhedron')) {
    for (const vert of geometry.vertices) {
      pushKeyValue(nodes, 'vert', formatNumberList(vert));
    }
    for (const face of geometry.faces) {
      pushKeyValue(nodes, 'face', formatNumberList(face));
    }
    for (const loop of geometry.loops) {
      pushKeyValue(nodes, 'loop', formatNumberList(loop));
    }
    for (const prism of geometry.prisms) {
      pushKeyValue(nodes, 'prism', formatNumberList(prism));
    }
    for (const pyramid of geometry.pyramids) {
      pushKeyValue(nodes, 'pyramid', formatNumberList(pyramid));
    }
  } else if (isGeometryType(geometry, 'nurbs')) {
    for (const value of geometry.uKnots) {
      pushKeyValue(nodes, 'uknot', formatNumberList(value));
    }
    for (const value of geometry.vKnots) {
      pushKeyValue(nodes, 'vknot', formatNumberList(value));
    }
    for (const value of geometry.sizes) {
      pushKeyValue(nodes, 'size', formatNumberList(value));
    }
    for (const value of geometry.controlPoints) {
      pushKeyValue(nodes, 'cp', formatNumberList(value));
    }
    for (const value of geometry.slices) {
      pushKeyValue(nodes, 'slice', formatNumberList(value));
    }
  }

  nodes.push(...shape.unknownKeys.map(cloneKeyValueNode));
  return nodes;
}

function renderLink(link: ZtkLink): ZtkNode[] {
  const nodes: ZtkNode[] = [createTagNode(link.tag)];
  pushKeyValue(nodes, 'name', link.name);
  pushKeyValue(nodes, 'jointtype', link.jointType);
  pushKeyValue(nodes, 'mass', link.mass !== undefined ? formatNumber(link.mass) : undefined);
  pushKeyValue(
    nodes,
    'density',
    link.density !== undefined ? formatNumber(link.density) : undefined,
  );
  pushKeyValue(nodes, 'stuff', link.stuff);
  pushKeyValue(nodes, 'COM', link.com ? formatVec3(link.com) : undefined);
  pushKeyValue(nodes, 'inertia', link.inertia ? formatMat3(link.inertia) : undefined);
  pushTransform(nodes, link.transform);
  pushKeyValue(nodes, 'dis', link.dis ? formatNumberList(link.dis) : undefined);
  pushKeyValue(nodes, 'min', link.min !== undefined ? formatNumber(link.min) : undefined);
  pushKeyValue(nodes, 'max', link.max !== undefined ? formatNumber(link.max) : undefined);
  pushKeyValue(
    nodes,
    'stiffness',
    link.stiffness !== undefined ? formatNumber(link.stiffness) : undefined,
  );
  pushKeyValue(
    nodes,
    'viscosity',
    link.viscosity !== undefined ? formatNumber(link.viscosity) : undefined,
  );
  pushKeyValue(
    nodes,
    'coulomb',
    link.coulomb !== undefined ? formatNumber(link.coulomb) : undefined,
  );
  pushKeyValue(
    nodes,
    'staticfriction',
    link.staticFriction !== undefined ? formatNumber(link.staticFriction) : undefined,
  );
  pushKeyValue(
    nodes,
    'forcethreshold',
    link.forceThreshold !== undefined ? formatNumber(link.forceThreshold) : undefined,
  );
  pushKeyValue(
    nodes,
    'torquethreshold',
    link.torqueThreshold !== undefined ? formatNumber(link.torqueThreshold) : undefined,
  );
  pushKeyValue(nodes, 'motor', link.motorName);
  for (const shapeName of link.shapeNames) {
    pushKeyValue(nodes, 'shape', shapeName);
  }
  pushKeyValue(nodes, 'parent', link.parentName);
  pushKeyValue(nodes, 'bind', link.bindName);
  nodes.push(...link.unknownKeys.map(cloneKeyValueNode));
  return nodes;
}

function renderUnknownSection(section: ZtkSemanticDocument['unknownSections'][number]): ZtkNode[] {
  const nodes: ZtkNode[] = [];
  if (section.tag) {
    nodes.push(createTagNode(section.tag.name));
  }
  nodes.push(...section.nodes.map(cloneKeyValueNode));
  return nodes;
}

export function semanticToAst(document: ZtkSemanticDocument): ZtkDocument {
  const nodes: ZtkNode[] = [];
  const groups = [
    renderChain(document.chain),
    ...document.optics.map(renderOptic),
    ...document.shapes.map(renderShape),
    ...document.motors.map(renderMotor),
    ...document.links.map(renderLink),
    renderChainInit(document.chainInit),
    ...document.unknownSections.map(renderUnknownSection),
  ];

  for (const group of groups) {
    if (group.length === 0) {
      continue;
    }
    if (nodes.length > 0) {
      nodes.push({ type: 'blank', raw: '' });
    }
    nodes.push(...group);
  }

  return createDocument(nodes);
}
