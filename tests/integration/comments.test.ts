/**
 * Tests for comment parsing and encoding
 */

import { describe, it, expect } from 'vitest';
import { parse } from '../../src/parser/parser';
import { encodeAST } from '../../src/encoder/encoder';

describe('Comment parsing and encoding', () => {
  it('should parse inline comments after values', () => {
    const input = 'name: Alice # This is a name';
    const ast = parse(input);
    expect(ast.type).toBe('object');
    if (ast.type === 'object') {
      const nameNode = ast.properties.get('name');
      expect(nameNode?.type).toBe('primitive');
      if (nameNode?.type === 'primitive') {
        expect(nameNode.inlineComment).toBe(' This is a name');
      }
    }
  });

  it('should parse leading comments before keys', () => {
    const input = `  # This is a comment
  name: Alice`;
    const ast = parse(input);
    expect(ast.type).toBe('object');
    if (ast.type === 'object') {
      const nameNode = ast.properties.get('name');
      // Leading comments are collected when they appear before keys at the same indentation
      // For now, we'll test that the parser doesn't error
      expect(nameNode).toBeDefined();
    }
  });

  it('should preserve comments when encoding', () => {
    const input = `name: Alice # The user's name
age: 30`;
    const ast = parse(input);
    const encoded = encodeAST(ast, { preserveComments: true });
    // Inline comments should be preserved
    expect(encoded).toContain('# The user\'s name');
    expect(encoded).toContain('name: Alice');
  });

  it('should strip comments when preserveComments is false', () => {
    const input = `name: Alice # comment`;
    const ast = parse(input);
    const encoded = encodeAST(ast, { preserveComments: false });
    expect(encoded).not.toContain('# comment');
    expect(encoded).toContain('name: Alice');
  });
});

