/**
 * AST Node type definitions for CJSON
 */

/**
 * Base interface for all AST nodes
 */
export interface BaseNode {
  line: number;
  column: number;
  /**
   * Comment that appears before this node (on its own line)
   */
  leadingComment?: string;
  /**
   * Comment that appears after this node on the same line (inline comment)
   */
  inlineComment?: string;
  /**
   * Comment that appears after this node (on its own line)
   */
  trailingComment?: string;
}

/**
 * Object node representing a CJSON object
 */
export interface ObjectNode extends BaseNode {
  type: 'object';
  properties: Map<string, ASTNode>;
}

/**
 * Array node representing a CJSON array
 */
export interface ArrayNode extends BaseNode {
  type: 'array';
  items: ASTNode[];
  format?: 'inline' | 'multiline' | 'compact';
}

/**
 * Primitive node representing a primitive value (string, number, boolean)
 */
export interface PrimitiveNode extends BaseNode {
  type: 'primitive';
  value: string | number | boolean;
  primitiveType: 'string' | 'number' | 'boolean';
  quoted: boolean;
}

/**
 * Null node representing a null value
 */
export interface NullNode extends BaseNode {
  type: 'null';
  value: null;
}

/**
 * Union type for all AST nodes
 */
export type ASTNode = ObjectNode | ArrayNode | PrimitiveNode | NullNode;

