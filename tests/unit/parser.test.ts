/**
 * Tests for CJSON parser
 */

import { describe, it, expect } from 'vitest';
import { parse } from '../../src/parser/parser';
import { tokenize } from '../../src/parser/tokenizer';
import { TokenType } from '../../src/parser/types';
import { ParseError } from '../../src/errors/errors';

describe('Tokenizer', () => {
  it('should tokenize empty string to EOF only', () => {
    const tokens = tokenize('');
    expect(tokens).toHaveLength(1);
    expect(tokens[0].type).toBe(TokenType.EOF);
  });

  it('should tokenize simple key-value pair', () => {
    const tokens = tokenize('name: Alice');
    expect(tokens.length).toBeGreaterThan(1);
    expect(tokens.find((t) => t.type === TokenType.KEY)?.value).toBe('name');
    expect(tokens.find((t) => t.type === TokenType.COLON)).toBeDefined();
    expect(tokens.find((t) => t.type === TokenType.VALUE)?.value).toBe('Alice');
  });

  it('should tokenize quoted strings with special characters', () => {
    const tokens = tokenize('note: "Hello, world"');
    const valueToken = tokens.find((t) => t.type === TokenType.VALUE);
    expect(valueToken?.value).toBe('Hello, world');
  });

  it('should tokenize comments correctly', () => {
    const tokens = tokenize('# This is a comment\nname: Alice');
    const commentToken = tokens.find((t) => t.type === TokenType.COMMENT);
    expect(commentToken?.value).toBe(' This is a comment');
  });

  it('should track indentation correctly', () => {
    const tokens = tokenize('  name: Alice');
    const indentToken = tokens.find((t) => t.type === TokenType.INDENT);
    expect(indentToken).toBeDefined();
    expect(indentToken?.value.length).toBe(2);
  });

  it('should handle newlines', () => {
    const tokens = tokenize('name: Alice\nage: 30');
    const newlineTokens = tokens.filter((t) => t.type === TokenType.NEWLINE);
    expect(newlineTokens.length).toBeGreaterThan(0);
  });

  it('should handle arrays with brackets', () => {
    const tokens = tokenize('tags: [python, javascript]');
    expect(tokens.find((t) => t.type === TokenType.BRACKET_OPEN)).toBeDefined();
    expect(tokens.find((t) => t.type === TokenType.BRACKET_CLOSE)).toBeDefined();
    expect(tokens.find((t) => t.type === TokenType.COMMA)).toBeDefined();
  });

  it('should handle dash for array items', () => {
    const tokens = tokenize('- item1\n- item2');
    const dashTokens = tokens.filter((t) => t.type === TokenType.DASH);
    expect(dashTokens.length).toBe(2);
  });
});

describe('Parser - Simple Objects', () => {
  it('should parse simple object with key-value pair', () => {
    const result = parse('name: Alice');
    expect(result.type).toBe('object');
    if (result.type === 'object') {
      expect(result.properties.has('name')).toBe(true);
      const nameNode = result.properties.get('name');
      expect(nameNode?.type).toBe('primitive');
      if (nameNode?.type === 'primitive') {
        expect(nameNode.value).toBe('Alice');
        expect(nameNode.primitiveType).toBe('string');
      }
    }
  });

  it('should parse object with multiple properties', () => {
    const result = parse('name: Alice\nage: 30');
    expect(result.type).toBe('object');
    if (result.type === 'object') {
      expect(result.properties.has('name')).toBe(true);
      expect(result.properties.has('age')).toBe(true);
      const ageNode = result.properties.get('age');
      if (ageNode?.type === 'primitive') {
        expect(ageNode.value).toBe(30);
        expect(ageNode.primitiveType).toBe('number');
      }
    }
  });

  it('should parse nested object with indentation', () => {
    const result = parse('address:\n  city: New York\n  zip: 10001');
    expect(result.type).toBe('object');
    if (result.type === 'object') {
      const addressNode = result.properties.get('address');
      expect(addressNode?.type).toBe('object');
      if (addressNode?.type === 'object') {
        expect(addressNode.properties.has('city')).toBe(true);
        expect(addressNode.properties.has('zip')).toBe(true);
      }
    }
  });

  it('should parse boolean values', () => {
    const result = parse('active: true\ninactive: false');
    expect(result.type).toBe('object');
    if (result.type === 'object') {
      const activeNode = result.properties.get('active');
      if (activeNode?.type === 'primitive') {
        expect(activeNode.value).toBe(true);
        expect(activeNode.primitiveType).toBe('boolean');
      }
    }
  });

  it('should parse null values', () => {
    const result = parse('empty: null');
    expect(result.type).toBe('object');
    if (result.type === 'object') {
      const emptyNode = result.properties.get('empty');
      expect(emptyNode?.type).toBe('null');
      if (emptyNode?.type === 'null') {
        expect(emptyNode.value).toBe(null);
      }
    }
  });
});

describe('Parser - Arrays', () => {
  it('should parse inline array of primitives', () => {
    const result = parse('tags: [python, javascript, typescript]');
    expect(result.type).toBe('object');
    if (result.type === 'object') {
      const tagsNode = result.properties.get('tags');
      expect(tagsNode?.type).toBe('array');
      if (tagsNode?.type === 'array') {
        expect(tagsNode.items.length).toBe(3);
        expect(tagsNode.format).toBe('inline');
      }
    }
  });

  it('should parse inline array of numbers', () => {
    const result = parse('numbers: [1, 2, 3, 4, 5]');
    expect(result.type).toBe('object');
    if (result.type === 'object') {
      const numbersNode = result.properties.get('numbers');
      if (numbersNode?.type === 'array') {
        expect(numbersNode.items.length).toBe(5);
        const firstItem = numbersNode.items[0];
        if (firstItem?.type === 'primitive') {
          expect(firstItem.value).toBe(1);
          expect(firstItem.primitiveType).toBe('number');
        }
      }
    }
  });

  it('should parse empty array', () => {
    const result = parse('empty: []');
    expect(result.type).toBe('object');
    if (result.type === 'object') {
      const emptyNode = result.properties.get('empty');
      if (emptyNode?.type === 'array') {
        expect(emptyNode.items.length).toBe(0);
      }
    }
  });
});

describe('Parser - Error Handling', () => {
  it('should throw error for empty input', () => {
    expect(() => parse('')).toThrow(ParseError);
  });

  it('should throw error for invalid syntax', () => {
    expect(() => parse('name:')).toThrow(ParseError);
  });

  it('should include line and column in error messages', () => {
    try {
      parse('name:');
    } catch (error) {
      expect(error).toBeInstanceOf(ParseError);
      if (error instanceof ParseError) {
        expect(error.line).toBeGreaterThan(0);
        expect(error.column).toBeGreaterThan(0);
      }
    }
  });
});

describe('Parser - Complex Cases', () => {
  it('should parse object with mixed types', () => {
    const result = parse('name: Alice\nage: 30\nactive: true\nscore: 95.5');
    expect(result.type).toBe('object');
    if (result.type === 'object') {
      expect(result.properties.size).toBe(4);
    }
  });

  it('should parse deeply nested objects', () => {
    const result = parse('level1:\n  level2:\n    level3:\n      value: deep');
    expect(result.type).toBe('object');
    if (result.type === 'object') {
      const level1 = result.properties.get('level1');
      if (level1?.type === 'object') {
        const level2 = level1.properties.get('level2');
        if (level2?.type === 'object') {
          const level3 = level2.properties.get('level3');
          if (level3?.type === 'object') {
            expect(level3.properties.has('value')).toBe(true);
          }
        }
      }
    }
  });
});

