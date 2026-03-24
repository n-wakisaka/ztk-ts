import { createDocument, type ZtkDocument, type ZtkKeyValueNode, type ZtkNode } from './ast.js';
import type {
  ZtkAutoOrMat3,
  ZtkAutoOrVec3,
  ZtkChain,
  ZtkChainIk,
  ZtkChainInit,
  ZtkChainInitJointState,
  ZtkContact,
  ZtkLink,
  ZtkMap,
  ZtkMat3,
  ZtkMat3x4,
  ZtkMotor,
  ZtkOptic,
  ZtkSemanticDocument,
  ZtkShape,
  ZtkShapeGeometry,
  ZtkTexture,
  ZtkTransform,
  ZtkVec3,
} from './semantic.js';
import { tokenizeValue } from './tokenize.js';

export type ZtkSemanticAstOptions = {
  normalizeLinkJointKeys?: boolean;
  normalizeShapeSource?: boolean;
  normalizeTransforms?: boolean;
};

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

function formatVec3OrAuto(value: ZtkAutoOrVec3): string {
  return value === 'auto' ? value : formatVec3(value);
}

function formatMat3(value: ZtkMat3): string {
  return `{\n${value.slice(0, 3).join(', ')}\n${value.slice(3, 6).join(', ')}\n${value
    .slice(6, 9)
    .join(', ')}\n}`;
}

function formatMat3OrAuto(value: ZtkAutoOrMat3): string {
  return value === 'auto' ? value : formatMat3(value);
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

function hasRawTransform(transform: ZtkTransform): boolean {
  return (
    transform.pos !== undefined ||
    transform.att !== undefined ||
    transform.frame !== undefined ||
    transform.dh !== undefined ||
    transform.rotations.length > 0
  );
}

function pushTransform(
  nodes: ZtkNode[],
  transform: ZtkTransform,
  options?: ZtkSemanticAstOptions,
): void {
  if (options?.normalizeTransforms) {
    if (!hasRawTransform(transform)) {
      return;
    }

    pushKeyValue(nodes, 'frame', formatMat3x4(transform.resolved.frame));
    return;
  }

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

function renderChainInit(
  chainInit: ZtkChainInit | undefined,
  options?: ZtkSemanticAstOptions,
): ZtkNode[] {
  if (!chainInit) {
    return [];
  }

  const nodes: ZtkNode[] = [createTagNode(chainInit.tag)];
  pushTransform(nodes, chainInit.transform, options);

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

function renderChainIk(chainIk: ZtkChainIk | undefined): ZtkNode[] {
  if (!chainIk) {
    return [];
  }

  const nodes: ZtkNode[] = [createTagNode(chainIk.tag)];
  for (const joint of chainIk.joints) {
    const tokens = [
      joint.selector,
      joint.weight !== undefined ? formatNumber(joint.weight) : undefined,
      ...joint.values.map(formatNumber),
    ].filter((value): value is string => value !== undefined);
    pushKeyValue(nodes, 'joint', tokens.join(' '));
  }
  for (const constraint of chainIk.constraints) {
    const tokens = [
      constraint.priority !== undefined ? formatNumber(constraint.priority) : undefined,
      constraint.name,
      constraint.type,
      ...constraint.linkNames,
      constraint.attentionPoint
        ? ['at', ...constraint.attentionPoint.map(formatNumber)].join(' ')
        : undefined,
      constraint.weight ? ['w', ...constraint.weight.map(formatNumber)].join(' ') : undefined,
      ...constraint.unknownTokens,
    ].filter((value): value is string => value !== undefined);
    pushKeyValue(nodes, 'constraint', tokens.join(' '));
  }
  nodes.push(...chainIk.unknownKeys.map(cloneKeyValueNode));
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

function renderContact(contact: ZtkContact): ZtkNode[] {
  const nodes: ZtkNode[] = [createTagNode(contact.tag)];
  pushKeyValue(nodes, 'bind', contact.bind ? contact.bind.join(' ') : undefined);
  if (contact.contactType === 'rigid') {
    pushKeyValue(
      nodes,
      'compensation',
      contact.compensation !== undefined ? formatNumber(contact.compensation) : undefined,
    );
    pushKeyValue(
      nodes,
      'relaxation',
      contact.relaxation !== undefined ? formatNumber(contact.relaxation) : undefined,
    );
  } else if (contact.contactType === 'elastic') {
    pushKeyValue(
      nodes,
      'elasticity',
      contact.elasticity !== undefined ? formatNumber(contact.elasticity) : undefined,
    );
    pushKeyValue(
      nodes,
      'viscosity',
      contact.viscosity !== undefined ? formatNumber(contact.viscosity) : undefined,
    );
  }
  pushKeyValue(
    nodes,
    'staticfriction',
    contact.staticFriction !== undefined ? formatNumber(contact.staticFriction) : undefined,
  );
  pushKeyValue(
    nodes,
    'kineticfriction',
    contact.kineticFriction !== undefined ? formatNumber(contact.kineticFriction) : undefined,
  );
  nodes.push(...contact.unknownKeys.map(cloneKeyValueNode));
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

function renderTexture(texture: ZtkTexture): ZtkNode[] {
  const nodes: ZtkNode[] = [createTagNode(texture.tag)];
  pushKeyValue(nodes, 'name', texture.name);
  pushKeyValue(nodes, 'file', texture.file);
  pushKeyValue(nodes, 'type', texture.type);
  pushKeyValue(
    nodes,
    'depth',
    texture.type === 'bump' && texture.depth !== undefined
      ? formatNumber(texture.depth)
      : undefined,
  );
  for (const coord of texture.coords) {
    pushKeyValue(nodes, 'coord', formatNumberList([coord.index, ...coord.uv]));
  }
  for (const face of texture.faces) {
    pushKeyValue(nodes, 'face', formatNumberList(face.indices));
  }
  nodes.push(...texture.unknownKeys.map(cloneKeyValueNode));
  return nodes;
}

function renderShape(shape: ZtkShape, options?: ZtkSemanticAstOptions): ZtkNode[] {
  const nodes: ZtkNode[] = [createTagNode(shape.tag)];
  const activeShapeSource: 'preserve' | 'mirror' | 'import' | 'geometry' =
    options?.normalizeShapeSource
      ? shape.mirrorName
        ? 'mirror'
        : shape.importName
          ? 'import'
          : 'geometry'
      : 'preserve';
  pushKeyValue(nodes, 'name', shape.name);
  pushKeyValue(
    nodes,
    'type',
    activeShapeSource === 'preserve' || activeShapeSource === 'geometry' ? shape.type : undefined,
  );
  pushKeyValue(nodes, 'optic', shape.opticName);
  pushKeyValue(nodes, 'texture', shape.textureName);
  pushKeyValue(
    nodes,
    'mirror',
    (activeShapeSource === 'preserve' || activeShapeSource === 'mirror') && shape.mirrorName
      ? [shape.mirrorName, shape.mirrorAxis].filter(Boolean).join(' ')
      : undefined,
  );
  pushKeyValue(
    nodes,
    'import',
    (activeShapeSource === 'preserve' || activeShapeSource === 'import') && shape.importName
      ? [
          shape.importName,
          shape.importScale !== undefined ? formatNumber(shape.importScale) : undefined,
        ]
          .filter((value) => value !== undefined)
          .join(' ')
      : undefined,
  );
  pushTransform(nodes, shape.transform, options);
  const geometry = shape.geometry;

  if (activeShapeSource !== 'preserve' && activeShapeSource !== 'geometry') {
    nodes.push(...shape.unknownKeys.map(cloneKeyValueNode));
    return nodes;
  }

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
    for (const loop of geometry.proceduralLoops) {
      pushKeyValue(nodes, 'loop', loop.join(' '));
    }
    for (const prism of geometry.prisms) {
      pushKeyValue(nodes, 'prism', formatNumberList(prism));
    }
    for (const pyramid of geometry.pyramids) {
      pushKeyValue(nodes, 'pyramid', formatNumberList(pyramid));
    }
  } else if (isGeometryType(geometry, 'nurbs')) {
    pushKeyValue(nodes, 'dim', geometry.dim ? formatNumberList(geometry.dim) : undefined);
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

function renderMap(map: ZtkMap): ZtkNode[] {
  const nodes: ZtkNode[] = [createTagNode(map.tag)];
  pushKeyValue(nodes, 'name', map.name);
  pushKeyValue(nodes, 'type', map.type);
  if (map.terra) {
    pushKeyValue(
      nodes,
      'origin',
      map.terra.origin ? formatNumberList(map.terra.origin) : undefined,
    );
    pushKeyValue(
      nodes,
      'resolution',
      map.terra.resolution ? formatNumberList(map.terra.resolution) : undefined,
    );
    pushKeyValue(nodes, 'size', map.terra.size ? formatNumberList(map.terra.size) : undefined);
    pushKeyValue(
      nodes,
      'zrange',
      map.terra.zrange ? formatNumberList(map.terra.zrange) : undefined,
    );
    pushKeyValue(
      nodes,
      'th_var',
      map.terra.thVar !== undefined ? formatNumber(map.terra.thVar) : undefined,
    );
    pushKeyValue(
      nodes,
      'th_grd',
      map.terra.thGrid !== undefined ? formatNumber(map.terra.thGrid) : undefined,
    );
    pushKeyValue(
      nodes,
      'th_res',
      map.terra.thRes !== undefined ? formatNumber(map.terra.thRes) : undefined,
    );
    for (const grid of map.terra.grids) {
      pushKeyValue(
        nodes,
        'grid',
        formatNumberList([
          ...grid.index,
          grid.z,
          ...grid.normal,
          grid.variance,
          grid.traversable ? 1 : 0,
        ]),
      );
    }
  }
  nodes.push(...map.unknownKeys.map(cloneKeyValueNode));
  return nodes;
}

function isAllowedLinkJointKey(link: ZtkLink, key: string): boolean {
  switch (link.joint.baseType) {
    case 'fixed':
      return false;
    case 'revolute':
    case 'prismatic':
      return (
        key === 'dis' ||
        key === 'min' ||
        key === 'max' ||
        key === 'stiffness' ||
        key === 'viscosity' ||
        key === 'coulomb' ||
        key === 'staticfriction' ||
        key === 'motor'
      );
    case 'cylindrical':
    case 'hooke':
      return (
        key === 'dis' ||
        key === 'min' ||
        key === 'max' ||
        key === 'stiffness' ||
        key === 'viscosity' ||
        key === 'coulomb' ||
        key === 'staticfriction'
      );
    case 'spherical':
      return key === 'dis' || key === 'motor';
    case 'planar':
    case 'float':
      return key === 'dis';
    case 'breakablefloat':
      return (
        key === 'dis' || key === 'break' || key === 'forcethreshold' || key === 'torquethreshold'
      );
    default:
      return true;
  }
}

function renderLink(link: ZtkLink, options?: ZtkSemanticAstOptions): ZtkNode[] {
  const nodes: ZtkNode[] = [createTagNode(link.tag)];
  const shouldEmitJointKey = (key: string): boolean =>
    !options?.normalizeLinkJointKeys || isAllowedLinkJointKey(link, key);
  pushKeyValue(nodes, 'name', link.name);
  pushKeyValue(nodes, 'jointtype', link.jointType);
  pushKeyValue(nodes, 'mass', link.mass !== undefined ? formatNumber(link.mass) : undefined);
  pushKeyValue(
    nodes,
    'density',
    link.density !== undefined ? formatNumber(link.density) : undefined,
  );
  pushKeyValue(nodes, 'stuff', link.stuff);
  pushKeyValue(nodes, 'COM', link.com ? formatVec3OrAuto(link.com) : undefined);
  pushKeyValue(nodes, 'inertia', link.inertia ? formatMat3OrAuto(link.inertia) : undefined);
  pushTransform(nodes, link.transform, options);
  pushKeyValue(
    nodes,
    'dis',
    shouldEmitJointKey('dis') && link.dis ? formatNumberList(link.dis) : undefined,
  );
  pushKeyValue(
    nodes,
    'break',
    shouldEmitJointKey('break') && link.breakValues
      ? formatNumberList(link.breakValues)
      : undefined,
  );
  pushKeyValue(
    nodes,
    'min',
    shouldEmitJointKey('min') && link.min !== undefined ? formatNumber(link.min) : undefined,
  );
  pushKeyValue(
    nodes,
    'max',
    shouldEmitJointKey('max') && link.max !== undefined ? formatNumber(link.max) : undefined,
  );
  pushKeyValue(
    nodes,
    'stiffness',
    shouldEmitJointKey('stiffness') && link.stiffness !== undefined
      ? formatNumber(link.stiffness)
      : undefined,
  );
  pushKeyValue(
    nodes,
    'viscosity',
    shouldEmitJointKey('viscosity') && link.viscosity !== undefined
      ? formatNumber(link.viscosity)
      : undefined,
  );
  pushKeyValue(
    nodes,
    'coulomb',
    shouldEmitJointKey('coulomb') && link.coulomb !== undefined
      ? formatNumber(link.coulomb)
      : undefined,
  );
  pushKeyValue(
    nodes,
    'staticfriction',
    shouldEmitJointKey('staticfriction') && link.staticFriction !== undefined
      ? formatNumber(link.staticFriction)
      : undefined,
  );
  pushKeyValue(
    nodes,
    'forcethreshold',
    shouldEmitJointKey('forcethreshold') && link.forceThreshold !== undefined
      ? formatNumber(link.forceThreshold)
      : undefined,
  );
  pushKeyValue(
    nodes,
    'torquethreshold',
    shouldEmitJointKey('torquethreshold') && link.torqueThreshold !== undefined
      ? formatNumber(link.torqueThreshold)
      : undefined,
  );
  pushKeyValue(nodes, 'motor', shouldEmitJointKey('motor') ? link.motorName : undefined);
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

export function semanticToAst(
  document: ZtkSemanticDocument,
  options?: ZtkSemanticAstOptions,
): ZtkDocument {
  const nodes: ZtkNode[] = [];
  const groups = [
    renderChain(document.chain),
    ...document.optics.map(renderOptic),
    ...document.textures.map(renderTexture),
    ...document.shapes.map((shape) => renderShape(shape, options)),
    ...document.motors.map(renderMotor),
    ...document.contacts.map(renderContact),
    ...document.links.map((link) => renderLink(link, options)),
    renderChainInit(document.chainInit, options),
    renderChainIk(document.chainIk),
    ...document.maps.map(renderMap),
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
