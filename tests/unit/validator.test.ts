/**
 * Structural validation helpers for parsed ASTs.
 */

import { describe, it, expect } from 'vitest';
import { parse } from '../../src/parser/parser';
import { ASTNode } from '../../src/ast/nodes';

function ensureNoEmptyKeys(node: ASTNode): boolean {
  if (node.type === 'object') {
    for (const [key, value] of node.properties.entries()) {
      if (key.trim().length === 0) {
        return false;
      }
      if (!ensureNoEmptyKeys(value)) {
        return false;
      }
    }
  } else if (node.type === 'array') {
    return node.items.every(ensureNoEmptyKeys);
  }
  return true;
}

function ensureLineNumbers(node: ASTNode): boolean {
  if (node.line <= 0 || node.column <= 0) {
    return false;
  }
  if (node.type === 'object') {
    for (const child of node.properties.values()) {
      if (!ensureLineNumbers(child)) {
        return false;
      }
    }
  } else if (node.type === 'array') {
    return node.items.every(ensureLineNumbers);
  }
  return true;
}

describe('Validator-inspired structural checks', () => {
  it('should ensure there are no empty keys in parsed objects', () => {
    const ast = parse(`user:
  name: Alice
  email: alice@example.com`);
    expect(ensureNoEmptyKeys(ast)).toBe(true);
  });

  it('should ensure every node carries line/column metadata', () => {
    const ast = parse(`data:
  - name: Alpha
    tags: [a, b]`);
    expect(ensureLineNumbers(ast)).toBe(true);
  });

  it('should still detect problematic structures produced manually', () => {
    const ast = parse('name: Alice');
    if (ast.type !== 'object') {
      throw new Error('Expected object AST');
    }
    const badAst: ASTNode = {
      type: 'object',
      properties: new Map([['', ast]]),
      line: 1,
      column: 1,
    };
    expect(ensureNoEmptyKeys(badAst)).toBe(false);
  });
});

