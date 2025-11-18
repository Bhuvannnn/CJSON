/**
 * Roundtrip-style tests: parse CJSON inputs and compare against expected JS objects
 */

import { describe, it, expect } from 'vitest';
import { parse } from '../../src/parser/parser';
import { ASTNode } from '../../src/ast/nodes';

function astToJS(node: ASTNode): unknown {
  switch (node.type) {
    case 'object': {
      const obj: Record<string, unknown> = {};
      for (const [key, value] of node.properties.entries()) {
        obj[key] = astToJS(value);
      }
      return obj;
    }
    case 'array':
      return node.items.map(astToJS);
    case 'primitive':
      return node.value;
    case 'null':
      return null;
    default:
      return null;
  }
}

describe('Roundtrip parsing', () => {
  it('should convert simple structures to JS objects', () => {
    const input = `name: Alice
age: 30
skills: [js, ts]`;

    const ast = parse(input);
    const js = astToJS(ast);
    expect(js).toEqual({
      name: 'Alice',
      age: 30,
      skills: ['js', 'ts'],
    });
  });

  it('should convert nested multi-line arrays to JS arrays/objects', () => {
    const input = `projects:
  - name: Alpha
    tags:
      - core
      - urgent
  - name: Beta
    tags:
      - research`;

    const ast = parse(input);
    const js = astToJS(ast);
    expect(js).toEqual({
      projects: [
        { name: 'Alpha', tags: ['core', 'urgent'] },
        { name: 'Beta', tags: ['research'] },
      ],
    });
  });

  it('should convert compact arrays into the expected JS structure', () => {
    const input = `users[2]:
  name: Alice, age: 30
  name: Bob, age: 25`;

    const ast = parse(input);
    const js = astToJS(ast);
    expect(js).toEqual({
      users: [
        { name: 'Alice', age: 30 },
        { name: 'Bob', age: 25 },
      ],
    });
  });
});

