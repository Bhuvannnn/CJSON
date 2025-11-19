/**
 * Tests for decode function
 */

import { describe, it, expect } from 'vitest';
import { decode } from '../../src/core/core';

describe('Decode function', () => {
  it('should decode simple object', () => {
    const input = `name: Alice
age: 30
active: true`;

    const result = decode(input);
    expect(result).toEqual({
      name: 'Alice',
      age: 30,
      active: true,
    });
  });

  it('should decode nested objects', () => {
    const input = `user:
  name: Alice
  address:
    city: New York
    zip: 10001`;

    const result = decode(input);
    expect(result).toEqual({
      user: {
        name: 'Alice',
        address: {
          city: 'New York',
          zip: 10001,
        },
      },
    });
  });

  it('should decode inline arrays', () => {
    const input = `tags: [python, javascript, typescript]
count: 3`;

    const result = decode(input);
    expect(result).toEqual({
      tags: ['python', 'javascript', 'typescript'],
      count: 3,
    });
  });

  it('should decode multi-line arrays', () => {
    const input = `items:
  - item1
  - item2
  - item3`;

    const result = decode(input);
    expect(result).toEqual({
      items: ['item1', 'item2', 'item3'],
    });
  });

  it('should decode arrays of objects', () => {
    const input = `users:
  - name: Alice
    age: 30
  - name: Bob
    age: 25`;

    const result = decode(input);
    expect(result).toEqual({
      users: [
        { name: 'Alice', age: 30 },
        { name: 'Bob', age: 25 },
      ],
    });
  });

  it('should decode compact array format', () => {
    const input = `users[2]:
  name: Alice, age: 30
  name: Bob, age: 25`;

    const result = decode(input);
    expect(result).toEqual({
      users: [
        { name: 'Alice', age: 30 },
        { name: 'Bob', age: 25 },
      ],
    });
  });

  it('should decode null values', () => {
    const input = `name: Alice
value: null`;

    const result = decode(input);
    expect(result).toEqual({
      name: 'Alice',
      value: null,
    });
  });

  it('should decode boolean values', () => {
    const input = `active: true
inactive: false`;

    const result = decode(input);
    expect(result).toEqual({
      active: true,
      inactive: false,
    });
  });

  it('should decode number values', () => {
    const input = `integer: 42
decimal: 3.14
negative: -10`;

    const result = decode(input);
    expect(result).toEqual({
      integer: 42,
      decimal: 3.14,
      negative: -10,
    });
  });
});

