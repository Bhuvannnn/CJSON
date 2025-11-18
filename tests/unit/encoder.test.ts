import { describe, it, expect } from 'vitest';
import { encode } from '../../src/encoder/encoder';
import { parse } from '../../src/parser/parser';
import { ArrayNode, ObjectNode } from '../../src/ast/nodes';
import { needsQuoting, escapeString } from '../../src/encoder/utils';

describe('Encoder - core functionality', () => {
  it('should encode simple objects with primitives', () => {
    const result = encode({ name: 'Alice', age: 30, active: true });
    expect(result).toBe(`name: Alice
age: 30
active: true`);
  });

  it('should encode nested objects with indentation', () => {
    const result = encode({
      name: 'Alice',
      address: {
        city: 'Seattle',
        zip: 98101,
      },
    });

    expect(result).toBe(`name: Alice
address:
  city: Seattle
  zip: 98101`);
  });

  it('should encode arrays of primitives inline', () => {
    const result = encode({ tags: ['alpha', 'beta', 'gamma'] });
    expect(result).toBe(`tags: [alpha, beta, gamma]`);
  });

  it('should wrap large primitive arrays using dash notation', () => {
    const result = encode({ tags: ['a', 'b', 'c', 'd', 'e', 'f'] });
    expect(result).toBe(`tags:
  - a
  - b
  - c
  - d
  - e
  - f`);
  });

  it('should encode arrays of complex values using compact format', () => {
    const result = encode({
      items: [
        { name: 'Alpha', priority: 1 },
        { name: 'Beta', priority: 2 },
      ],
    });

    expect(result).toBe(`items[2]{name, priority}:
  name: Alpha, priority: 1
  name: Beta, priority: 2`);
  });

  it('should encode empty objects and arrays inline', () => {
    expect(encode({ meta: {}, tags: [] })).toBe(`meta: {}
tags: []`);
  });

  it('should encode uniform object arrays using compact format', () => {
    const result = encode({
      users: [
        { name: 'Alice', age: 30 },
        { name: 'Bob', age: 25 },
      ],
    });

    expect(result).toBe(`users[2]{name, age}:
  name: Alice, age: 30
  name: Bob, age: 25`);
  });

  it('should fallback to dash arrays when compact arrays are disabled', () => {
    const result = encode(
      {
        users: [
          { name: 'Alice', age: 30 },
          { name: 'Bob', age: 25 },
        ],
      },
      { compactArrays: false },
    );

    expect(result).toBe(`users:
  -
    name: Alice
    age: 30
  -
    name: Bob
    age: 25`);
  });

  it('should fallback to dash arrays when rows contain nested values', () => {
    const result = encode({
      users: [
        { name: 'Alice', tags: ['core'] },
        { name: 'Bob', tags: ['beta'] },
      ],
    });

    expect(result).toBe(`users:
  -
    name: Alice
    tags: [core]
  -
    name: Bob
    tags: [beta]`);
  });

  it('should encode root primitives', () => {
    expect(encode('hello')).toBe('hello');
    expect(encode(42)).toBe('42');
    expect(encode(false)).toBe('false');
    expect(encode(null)).toBe('null');
  });

  it('should encode Date instances using ISO strings', () => {
    const date = new Date('2020-01-01T00:00:00.000Z');
    const result = encode({ timestamp: date });
    expect(result).toBe('timestamp: "2020-01-01T00:00:00.000Z"');
  });

  it('should respect the indent option', () => {
    const result = encode(
      {
        level1: {
          level2: {
            value: true,
          },
        },
      },
      { indent: 4 },
    );

    expect(result).toBe(`level1:
    level2:
        value: true`);
  });

  it('should respect the newline option', () => {
    const result = encode(
      {
        level1: {
          value: 'multi',
          nested: ['a', 'b', 'c', 'd', 'e', 'f'],
        },
      },
      { newline: '\r\n' },
    );

    const expected = [
      'level1:',
      '  value: multi',
      '  nested:',
      '    - a',
      '    - b',
      '    - c',
      '    - d',
      '    - e',
      '    - f',
    ].join('\r\n');

    expect(result).toBe(expected);
  });

  it('should obey quoteMode="always" for nested values', () => {
    const result = encode(
      {
        name: 'Alice',
        nested: { city: 'Seattle' },
      },
      { quoteMode: 'always' },
    );

    expect(result).toBe(`name: "Alice"
nested:
  city: "Seattle"`);
  });

  it('should throw on unsupported values', () => {
    expect(() => encode(undefined)).toThrowError();
    expect(() => encode(Symbol('id'))).toThrowError();
  });
});

describe('Encoder - string quoting', () => {
  it('should detect when strings require quoting', () => {
    expect(needsQuoting('alpha')).toBe(false);
    expect(needsQuoting('two words')).toBe(true);
    expect(needsQuoting('123')).toBe(true);
    expect(needsQuoting('value:42')).toBe(true);
    expect(needsQuoting('true')).toBe(true);
    expect(needsQuoting('safe_value-1')).toBe(false);
    expect(needsQuoting('spaced ')).toBe(true);
  });

  it('should escape special characters inside quotes', () => {
    const escaped = escapeString('He said "hello"\n\t');
    expect(escaped).toBe('He said \\"hello\\"\\n\\t');
  });

  it('should quote strings with spaces in auto mode', () => {
    const result = encode({ note: 'hello world' });
    expect(result).toBe('note: "hello world"');
  });

  it('should obey quoteMode="always"', () => {
    expect(encode('value', { quoteMode: 'always' })).toBe('"value"');
  });

  it('should obey quoteMode="never"', () => {
    expect(encode('needs quotes', { quoteMode: 'never' })).toBe('needs quotes');
  });
});

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

