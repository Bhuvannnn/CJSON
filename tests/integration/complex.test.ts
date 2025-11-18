/**
 * Tests for complex CJSON parsing scenarios
 */

import { describe, it, expect } from 'vitest';
import { parse } from '../../src/parser/parser';

describe('Parser - Complex Cases', () => {
  it('should parse nested multi-line arrays', () => {
    const input = `items:
  - item1
  - item2
  - item3`;
    
    const result = parse(input);
    expect(result.type).toBe('object');
    if (result.type === 'object') {
      const itemsNode = result.properties.get('items');
      expect(itemsNode?.type).toBe('array');
      if (itemsNode?.type === 'array') {
        expect(itemsNode.items.length).toBe(3);
      }
    }
  });

  it('should parse nested multi-line arrays with objects', () => {
    const input = `users:
  - name: Alice
    age: 30
  - name: Bob
    age: 25`;
    
    const result = parse(input);
    expect(result.type).toBe('object');
    if (result.type === 'object') {
      const usersNode = result.properties.get('users');
      expect(usersNode?.type).toBe('array');
      if (usersNode?.type === 'array') {
        expect(usersNode.items.length).toBe(2);
        const firstUser = usersNode.items[0];
        if (firstUser?.type === 'object') {
          expect(firstUser.properties.has('name')).toBe(true);
          expect(firstUser.properties.has('age')).toBe(true);
        }
      }
    }
  });

  it('should parse deeply nested multi-line arrays', () => {
    const input = `data:
  - items:
      - item1
      - item2
  - items:
      - item3
      - item4`;
    
    const result = parse(input);
    expect(result.type).toBe('object');
    if (result.type === 'object') {
      const dataNode = result.properties.get('data');
      expect(dataNode?.type).toBe('array');
      if (dataNode?.type === 'array') {
        expect(dataNode.items.length).toBe(2);
        const firstItem = dataNode.items[0];
        if (firstItem?.type === 'object') {
          const nestedItems = firstItem.properties.get('items');
          if (nestedItems?.type === 'array') {
            expect(nestedItems.items.length).toBe(2);
          }
        }
      }
    }
  });

  it('should parse mixed inline and multi-line arrays', () => {
    const input = `tags: [python, javascript]
items:
  - item1
  - item2`;
    
    const result = parse(input);
    expect(result.type).toBe('object');
    if (result.type === 'object') {
      expect(result.properties.has('tags')).toBe(true);
      expect(result.properties.has('items')).toBe(true);
      const tagsNode = result.properties.get('tags');
      const itemsNode = result.properties.get('items');
      if (tagsNode?.type === 'array' && itemsNode?.type === 'array') {
        expect(tagsNode.items.length).toBe(2);
        expect(itemsNode.items.length).toBe(2);
      }
    }
  });

  it('should parse compact inline arrays declared with header', () => {
    const input = 'ids[3]: 1, 2, 3';
    const result = parse(input);
    expect(result.type).toBe('object');
    if (result.type === 'object') {
      const idsNode = result.properties.get('ids');
      expect(idsNode?.type).toBe('array');
      if (idsNode?.type === 'array') {
        expect(idsNode.items.length).toBe(3);
        expect(idsNode.format).toBe('compact');
      }
    }
  });

  it('should parse compact multi-line object arrays', () => {
    const input = `users[2]:
  name: Alice, age: 30
  name: Bob, age: 25`;

    const result = parse(input);
    expect(result.type).toBe('object');
    if (result.type === 'object') {
      const usersNode = result.properties.get('users');
      expect(usersNode?.type).toBe('array');
      if (usersNode?.type === 'array') {
        expect(usersNode.items.length).toBe(2);
        expect(usersNode.format).toBe('compact');
        const first = usersNode.items[0];
        if (first?.type === 'object') {
          expect(first.properties.has('name')).toBe(true);
          expect(first.properties.has('age')).toBe(true);
        }
      }
    }
  });

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

