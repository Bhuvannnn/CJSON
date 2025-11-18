/**
 * Encoder-adjacent tests: ensure the AST contains enough metadata for formatting decisions.
 */

import { describe, it, expect } from 'vitest';
import { parse } from '../../src/parser/parser';
import { ArrayNode, ObjectNode } from '../../src/ast/nodes';

describe('Parser metadata for future encoder', () => {
  it('should capture line/column information for top-level objects', () => {
    const ast = parse('name: Alice');
    expect(ast.type).toBe('object');
    if (ast.type === 'object') {
      expect(ast.line).toBe(1);
      expect(ast.column).toBe(1);
      const nameNode = ast.properties.get('name');
      expect(nameNode).toBeDefined();
      if (nameNode?.type === 'primitive') {
        expect(nameNode.line).toBe(1);
        expect(nameNode.column).toBe(7);
      }
    }
  });

  it('should mark inline arrays with format="inline"', () => {
    const ast = parse('ids: [1, 2, 3]');
    if (ast.type !== 'object') {
      throw new Error('Expected object AST');
    }
    const idsNode = ast.properties.get('ids') as ArrayNode;
    expect(idsNode?.format).toBe('inline');
  });

  it('should mark multi-line dash arrays with format="multiline"', () => {
    const ast = parse(`items:
  - a
  - b`);
    if (ast.type !== 'object') {
      throw new Error('Expected object AST');
    }
    const itemsNode = ast.properties.get('items') as ArrayNode;
    expect(itemsNode?.format).toBe('multiline');
  });

  it('should mark compact arrays with format="compact"', () => {
    const ast = parse(`users[1]:
  name: Alice`);
    if (ast.type !== 'object') {
      throw new Error('Expected object AST');
    }
    const usersNode = ast.properties.get('users') as ArrayNode;
    expect(usersNode?.format).toBe('compact');
  });

  it('should preserve insertion order for object properties', () => {
    const ast = parse(`alpha: 1
beta: 2
gamma: 3`);
    if (ast.type !== 'object') {
      throw new Error('Expected object AST');
    }
    const keys = Array.from(ast.properties.keys());
    expect(keys).toEqual(['alpha', 'beta', 'gamma']);
  });
});

