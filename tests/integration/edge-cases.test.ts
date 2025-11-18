/**
 * Tests for edge cases in CJSON parsing
 */

import { describe, it, expect } from 'vitest';
import { parse } from '../../src/parser/parser';
import { ParseError } from '../../src/errors/errors';

describe('Parser - Edge Cases', () => {
  it('should parse empty object', () => {
    const result = parse('key:');
    expect(result.type).toBe('object');
    if (result.type === 'object') {
      const value = result.properties.get('key');
      expect(value?.type).toBe('object');
      if (value?.type === 'object') {
        expect(value.properties.size).toBe(0);
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

  it('should parse values with spaces', () => {
    const result = parse('city: New York');
    expect(result.type).toBe('object');
    if (result.type === 'object') {
      const cityNode = result.properties.get('city');
      if (cityNode?.type === 'primitive') {
        expect(cityNode.value).toBe('New York');
      }
    }
  });

  it('should parse quoted strings with special characters', () => {
    const result = parse('note: "Hello, world!"');
    expect(result.type).toBe('object');
    if (result.type === 'object') {
      const noteNode = result.properties.get('note');
      if (noteNode?.type === 'primitive') {
        expect(noteNode.value).toBe('Hello, world!');
      }
    }
  });

  it('should handle indentation correctly', () => {
    const result = parse('a:\n  b: 1\n  c: 2\nd: 3');
    expect(result.type).toBe('object');
    if (result.type === 'object') {
      expect(result.properties.has('a')).toBe(true);
      expect(result.properties.has('d')).toBe(true);
      const aNode = result.properties.get('a');
      if (aNode?.type === 'object') {
        expect(aNode.properties.has('b')).toBe(true);
        expect(aNode.properties.has('c')).toBe(true);
      }
    }
  });

  it('should throw error for empty input', () => {
    expect(() => parse('')).toThrow(ParseError);
  });

  it('should throw error when compact array count mismatches rows', () => {
    const input = `users[2]:
  name: Alice, age: 30`;
    expect(() => parse(input)).toThrow(ParseError);
  });

  it('should throw error for invalid syntax', () => {
    expect(() => parse('name::')).toThrow(ParseError);
  });
});

