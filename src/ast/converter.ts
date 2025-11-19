/**
 * AST to JavaScript value converter
 * Converts AST nodes to plain JavaScript values
 */

import { ASTNode, ObjectNode, ArrayNode, PrimitiveNode, NullNode } from './nodes';

/**
 * Converts an AST node to a JavaScript value
 * @param node - The AST node to convert
 * @param options - Conversion options
 * @returns JavaScript value (object, array, or primitive)
 */
export function astToJS(node: ASTNode): unknown {
  switch (node.type) {
    case 'object': {
      return astObjectToJS(node);
    }
    case 'array': {
      return astArrayToJS(node);
    }
    case 'primitive': {
      return astPrimitiveToJS(node);
    }
    case 'null': {
      return null;
    }
    default: {
      // Exhaustiveness check
      const _exhaustive: never = node;
      return null;
    }
  }
}

/**
 * Converts an ObjectNode to a JavaScript object
 */
function astObjectToJS(node: ObjectNode): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  for (const [key, value] of node.properties.entries()) {
    obj[key] = astToJS(value);
  }
  return obj;
}

/**
 * Converts an ArrayNode to a JavaScript array
 */
function astArrayToJS(node: ArrayNode): unknown[] {
  return node.items.map(astToJS);
}

/**
 * Converts a PrimitiveNode to a JavaScript primitive value
 */
function astPrimitiveToJS(node: PrimitiveNode): string | number | boolean {
  return node.value;
}

