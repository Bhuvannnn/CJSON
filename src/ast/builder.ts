/**
 * AST Builder utilities for creating AST nodes
 */

import { ASTNode, ObjectNode, ArrayNode, PrimitiveNode, NullNode } from './nodes';

/**
 * Builds an ObjectNode from a properties map
 * @param properties - Map of property names to AST nodes
 * @param line - Line number
 * @param column - Column number
 * @returns ObjectNode
 */
export function buildObjectNode(
  properties: Map<string, ASTNode>,
  line: number = 1,
  column: number = 1
): ObjectNode {
  return {
    type: 'object',
    properties,
    line,
    column,
  };
}

/**
 * Builds an ArrayNode from an items array
 * @param items - Array of AST nodes
 * @param format - Array format type
 * @param line - Line number
 * @param column - Column number
 * @returns ArrayNode
 */
export function buildArrayNode(
  items: ASTNode[],
  format: 'inline' | 'multiline' | 'compact' = 'inline',
  line: number = 1,
  column: number = 1
): ArrayNode {
  return {
    type: 'array',
    items,
    format,
    line,
    column,
  };
}

/**
 * Builds a PrimitiveNode with type inference
 * @param value - Primitive value (string, number, or boolean)
 * @param quoted - Whether the value was quoted in source
 * @param line - Line number
 * @param column - Column number
 * @returns PrimitiveNode
 */
export function buildPrimitiveNode(
  value: string | number | boolean,
  quoted: boolean = false,
  line: number = 1,
  column: number = 1
): PrimitiveNode {
  let primitiveType: 'string' | 'number' | 'boolean';
  
  if (typeof value === 'number') {
    primitiveType = 'number';
  } else if (typeof value === 'boolean') {
    primitiveType = 'boolean';
  } else {
    primitiveType = 'string';
  }

  return {
    type: 'primitive',
    value,
    primitiveType,
    quoted,
    line,
    column,
  };
}

/**
 * Builds a NullNode
 * @param line - Line number
 * @param column - Column number
 * @returns NullNode
 */
export function buildNullNode(line: number = 1, column: number = 1): NullNode {
  return {
    type: 'null',
    value: null,
    line,
    column,
  };
}

