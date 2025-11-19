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

  it('should parse very long strings', () => {
    const longString = 'a'.repeat(5000);
    const input = `payload: ${longString}`;
    const result = parse(input);
    expect(result.type).toBe('object');
    if (result.type === 'object') {
      const payload = result.properties.get('payload');
      expect(payload?.type).toBe('primitive');
      if (payload?.type === 'primitive') {
        expect(payload.value).toBe(longString);
        expect((payload.value as string).length).toBe(5000);
      }
    }
  });

  it('should parse unicode characters in values', () => {
    const input = 'greeting: "こんにちは 🌸"\nstatus: "🚀 ready"';
    const result = parse(input);
    expect(result.type).toBe('object');
    if (result.type === 'object') {
      const greeting = result.properties.get('greeting');
      const status = result.properties.get('status');
      if (greeting?.type === 'primitive' && status?.type === 'primitive') {
        expect(greeting.value).toBe('こんにちは 🌸');
        expect(status.value).toBe('🚀 ready');
      }
    }
  });

  it('should parse deeply nested structures (10+ levels)', () => {
    const depth = 12;
    const lines: string[] = [];
    for (let level = 1; level <= depth; level++) {
      const indent = '  '.repeat(level - 1);
      lines.push(`${indent}level${level}:`);
    }
    lines.push(`${'  '.repeat(depth)}value: done`);
    const input = lines.join('\n');
    const ast = parse(input);
    expect(ast.type).toBe('object');
    if (ast.type !== 'object') {
      return;
    }

    let current = ast;
    for (let level = 1; level <= depth; level++) {
      const next = current.properties.get(`level${level}`);
      expect(next).toBeDefined();
      expect(next?.type).toBe('object');
      if (next?.type !== 'object') {
        return;
      }
      current = next;
    }

    const terminal = current.properties.get('value');
    expect(terminal?.type).toBe('primitive');
    if (terminal?.type === 'primitive') {
      expect(terminal.value).toBe('done');
    }
  });
});

