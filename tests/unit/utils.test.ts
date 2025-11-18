/**
 * Tests for parser utilities
 */

import { describe, it, expect } from 'vitest';
import { checkArrayUniformity } from '../../src/parser/utils';
import { ArrayNode, ObjectNode, PrimitiveNode } from '../../src/ast/nodes';

function makePrimitive(value: string | number | boolean): PrimitiveNode {
  return {
    type: 'primitive',
    value,
    primitiveType: typeof value === 'number' ? 'number' : typeof value === 'boolean' ? 'boolean' : 'string',
    quoted: false,
    line: 1,
    column: 1,
  };
}

function makeObject(properties: Record<string, PrimitiveNode>): ObjectNode {
  return {
    type: 'object',
    properties: new Map(Object.entries(properties)),
    line: 1,
    column: 1,
  };
}

describe('parser/utils - checkArrayUniformity', () => {
  it('should treat empty arrays as uniform', () => {
    const arrayNode: ArrayNode = {
      type: 'array',
      items: [],
      format: 'inline',
      line: 1,
      column: 1,
    };
    expect(checkArrayUniformity(arrayNode)).toBe(true);
  });

  it('should detect uniform arrays of objects', () => {
    const items = [
      makeObject({ id: makePrimitive(1), name: makePrimitive('Alpha') }),
      makeObject({ id: makePrimitive(2), name: makePrimitive('Beta') }),
    ];
    const arrayNode: ArrayNode = {
      type: 'array',
      items,
      format: 'multiline',
      line: 1,
      column: 1,
    };
    expect(checkArrayUniformity(arrayNode)).toBe(true);
  });

  it('should detect non-uniform arrays when keys differ', () => {
    const items = [
      makeObject({ id: makePrimitive(1), name: makePrimitive('Alpha') }),
      makeObject({ id: makePrimitive(2), title: makePrimitive('Beta') }),
    ];
    const arrayNode: ArrayNode = {
      type: 'array',
      items,
      format: 'multiline',
      line: 1,
      column: 1,
    };
    expect(checkArrayUniformity(arrayNode)).toBe(false);
  });

  it('should detect non-uniform arrays when types differ', () => {
    const arrayNode: ArrayNode = {
      type: 'array',
      items: [makeObject({ id: makePrimitive(1) }), makePrimitive('oops')],
      format: 'multiline',
      line: 1,
      column: 1,
    };
    expect(checkArrayUniformity(arrayNode)).toBe(false);
  });
});

