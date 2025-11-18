/**
 * Validator tests
 */

import { describe, it, expect } from 'vitest';
import { parse } from '../../src/parser/parser';
import { validate, validateArrayUniformity, validateTypes } from '../../src/validator/validator';
import { PropertySchema } from '../../src/validator/types';

describe('Validator', () => {
  describe('validate - schema validation', () => {
    it('should validate valid structures', () => {
      const ast = parse('name: Alice\nage: 30');
      const schema: PropertySchema = {
        type: 'object',
        schema: {
          properties: {
            name: { type: 'string' },
            age: { type: 'number' },
          },
        },
      };
      const result = validate(ast, schema);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing required properties', () => {
      const ast = parse('name: Alice');
      const schema: PropertySchema = {
        type: 'object',
        schema: {
          required: ['name', 'email'],
          properties: {
            name: { type: 'string' },
            email: { type: 'string' },
          },
        },
      };
      const result = validate(ast, schema);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].message).toContain('Missing required property');
      expect(result.errors[0].message).toContain('email');
    });

    it('should detect type mismatches', () => {
      const ast = parse('age: thirty');
      const schema: PropertySchema = {
        type: 'object',
        schema: {
          properties: {
            age: { type: 'number' },
          },
        },
      };
      const result = validate(ast, schema);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].message).toContain('Expected number');
    });

    it('should validate nested objects', () => {
      const ast = parse('user:\n  name: Alice\n  age: 30');
      const schema: PropertySchema = {
        type: 'object',
        schema: {
          properties: {
            user: {
              type: 'object',
              schema: {
                properties: {
                  name: { type: 'string' },
                  age: { type: 'number' },
                },
              },
            },
          },
        },
      };
      const result = validate(ast, schema);
      expect(result.valid).toBe(true);
    });
  });

  describe('validateArrayUniformity', () => {
    it('should validate uniform arrays', () => {
      const ast = parse(`users:
  - name: Alice
    age: 30
  - name: Bob
    age: 25`);
      if (ast.type !== 'object') {
        throw new Error('Expected object');
      }
      const usersNode = ast.properties.get('users');
      if (usersNode?.type !== 'array') {
        throw new Error('Expected array');
      }
      const result = validateArrayUniformity(usersNode);
      expect(result.valid).toBe(true);
    });

    it('should detect non-uniform arrays', () => {
      const ast = parse(`items:
  - name: Alpha
    id: 1
  - title: Beta`);
      if (ast.type !== 'object') {
        throw new Error('Expected object');
      }
      const itemsNode = ast.properties.get('items');
      if (itemsNode?.type !== 'array') {
        throw new Error('Expected array');
      }
      const result = validateArrayUniformity(itemsNode);
      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toContain('uniform');
    });
  });

  describe('validateTypes', () => {
    it('should validate string types', () => {
      const ast = parse('name: Alice');
      if (ast.type !== 'object') {
        throw new Error('Expected object');
      }
      const nameNode = ast.properties.get('name');
      if (!nameNode) {
        throw new Error('Expected name node');
      }
      const result = validateTypes(nameNode, 'string', 'name');
      expect(result.valid).toBe(true);
    });

    it('should detect type mismatches', () => {
      const ast = parse('age: thirty');
      if (ast.type !== 'object') {
        throw new Error('Expected object');
      }
      const ageNode = ast.properties.get('age');
      if (!ageNode) {
        throw new Error('Expected age node');
      }
      const result = validateTypes(ageNode, 'number', 'age');
      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toContain('Expected number');
    });
  });
});

