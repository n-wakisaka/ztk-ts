export type ZtkNode = ZtkBlankLineNode | ZtkCommentNode | ZtkTagNode | ZtkKeyValueNode;

export type ZtkDocument = {
  nodes: ZtkNode[];
};

export type ZtkBlankLineNode = {
  type: 'blank';
  raw: string;
};

export type ZtkCommentNode = {
  type: 'comment';
  raw: string;
  text: string;
};

export type ZtkTagNode = {
  type: 'tag';
  raw: string;
  name: string;
};

export type ZtkKeyValueNode = {
  type: 'keyValue';
  rawLines: string[];
  key: string;
  rawValue: string;
  values: string[];
};

export type ZtkSection = {
  tag: ZtkTagNode | null;
  nodes: ZtkKeyValueNode[];
};

export function createDocument(nodes: ZtkNode[] = []): ZtkDocument {
  return { nodes };
}

export function getSections(document: ZtkDocument): ZtkSection[] {
  const sections: ZtkSection[] = [];
  let current: ZtkSection = { tag: null, nodes: [] };

  for (const node of document.nodes) {
    if (node.type === 'tag') {
      if (current.tag !== null || current.nodes.length > 0) {
        sections.push(current);
      }
      current = { tag: node, nodes: [] };
      continue;
    }

    if (node.type === 'keyValue') {
      current.nodes.push(node);
    }
  }

  if (current.tag !== null || current.nodes.length > 0) {
    sections.push(current);
  }

  return sections;
}
