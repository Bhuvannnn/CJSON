/**
 * Validator for CJSON AST nodes
 * Validates structure, types, and array uniformity
 */

import { ASTNode, ObjectNode, ArrayNode } from '../ast/nodes';
import { ValidationError, ValidationResult, ObjectSchema, ArraySchema, PropertySchema } from './types';
import { checkArrayUniformity } from '../parser/utils';

/**
 * Validates an AST node against a schema
 */
export function validate(node: ASTNode, schema?: PropertySchema): ValidationResult {
  const errors: ValidationError[] = [];
  
  if (schema) {
    validateNode(node, schema, '', errors);
  } else {
    // Basic structural validation if no schema provided
    validateStructure(node, '', errors);
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validates a node against a property schema
 */
function validateNode(
  node: ASTNode,
  schema: PropertySchema,
  path: string,
  errors: ValidationError[],
): void {
  switch (schema.type) {
    case 'any':
      // No validation needed
      break;
    case 'string':
      if (node.type !== 'primitive' || node.primitiveType !== 'string') {
        errors.push({
          message: `Expected string, got ${node.type}`,
          path,
          line: node.line,
          column: node.column,
        });
      }
      break;
    case 'number':
      if (node.type !== 'primitive' || node.primitiveType !== 'number') {
        errors.push({
          message: `Expected number, got ${node.type}`,
          path,
          line: node.line,
          column: node.column,
        });
      }
      break;
    case 'boolean':
      if (node.type !== 'primitive' || node.primitiveType !== 'boolean') {
        errors.push({
          message: `Expected boolean, got ${node.type}`,
          path,
          line: node.line,
          column: node.column,
        });
      }
      break;
    case 'null':
      if (node.type !== 'null') {
        errors.push({
          message: `Expected null, got ${node.type}`,
          path,
          line: node.line,
          column: node.column,
        });
      }
      break;
    case 'object':
      if (node.type !== 'object') {
        errors.push({
          message: `Expected object, got ${node.type}`,
          path,
          line: node.line,
          column: node.column,
        });
        return;
      }
      validateObjectStructure(node, schema.schema, path, errors);
      break;
    case 'array':
      if (node.type !== 'array') {
        errors.push({
          message: `Expected array, got ${node.type}`,
          path,
          line: node.line,
          column: node.column,
        });
        return;
      }
      validateArrayStructure(node, schema.schema, path, errors);
      break;
  }
}

/**
 * Validates object structure against a schema
 */
function validateObjectStructure(
  node: ObjectNode,
  schema: ObjectSchema,
  path: string,
  errors: ValidationError[],
): void {
  // Check required properties
  if (schema.required) {
    for (const requiredKey of schema.required) {
      if (!node.properties.has(requiredKey)) {
        errors.push({
          message: `Missing required property: ${requiredKey}`,
          path: path ? `${path}.${requiredKey}` : requiredKey,
          line: node.line,
          column: node.column,
        });
      }
    }
  }
  
  // Validate properties against schemas
  if (schema.properties) {
    for (const [key, propertySchema] of Object.entries(schema.properties)) {
      const value = node.properties.get(key);
      if (value) {
        const propertyPath = path ? `${path}.${key}` : key;
        validateNode(value, propertySchema, propertyPath, errors);
      }
    }
  }
}

/**
 * Validates array structure against a schema
 */
function validateArrayStructure(
  node: ArrayNode,
  schema: ArraySchema,
  path: string,
  errors: ValidationError[],
): void {
  // Check uniformity if required
  if (schema.uniform !== false) {
    // Default to checking uniformity
    const isUniform = checkArrayUniformity(node);
    if (!isUniform && node.items.length > 0) {
      errors.push({
        message: 'Array items must have uniform structure',
        path,
        line: node.line,
        column: node.column,
      });
    }
  }
  
  // Validate items against item schema if provided
  if (schema.items) {
    for (let i = 0; i < node.items.length; i++) {
      const item = node.items[i];
      const itemPath = path ? `${path}[${i}]` : `[${i}]`;
      validateNode(item, schema.items, itemPath, errors);
    }
  }
}

/**
 * Performs basic structural validation (no schema)
 */
function validateStructure(
  node: ASTNode,
  path: string,
  errors: ValidationError[],
): void {
  switch (node.type) {
    case 'object': {
      // Check for empty keys
      for (const [key, value] of node.properties.entries()) {
        if (key.trim().length === 0) {
          errors.push({
            message: 'Object property has empty key',
            path: path || '<root>',
            line: node.line,
            column: node.column,
          });
        }
        const propertyPath = path ? `${path}.${key}` : key;
        validateStructure(value, propertyPath, errors);
      }
      break;
    }
    case 'array': {
      for (let i = 0; i < node.items.length; i++) {
        const item = node.items[i];
        const itemPath = path ? `${path}[${i}]` : `[${i}]`;
        validateStructure(item, itemPath, errors);
      }
      break;
    }
    case 'primitive':
    case 'null':
      // No structural issues for primitives
      break;
  }
}

/**
 * Validates that an array has uniform structure
 * (All items are objects with the same keys)
 */
export function validateArrayUniformity(node: ArrayNode): ValidationResult {
  const isUniform = checkArrayUniformity(node);
  
  if (!isUniform && node.items.length > 0) {
    return {
      valid: false,
      errors: [
        {
          message: 'Array items do not have uniform structure',
          path: '',
          line: node.line,
          column: node.column,
        },
      ],
    };
  }
  
  return { valid: true, errors: [] };
}

/**
 * Validates primitive types
 */
export function validateTypes(
  node: ASTNode,
  expectedType: 'string' | 'number' | 'boolean' | 'null',
  path: string = '',
): ValidationResult {
  const errors: ValidationError[] = [];
  
  switch (expectedType) {
    case 'string':
      if (node.type !== 'primitive' || node.primitiveType !== 'string') {
        errors.push({
          message: `Expected string, got ${node.type}`,
          path,
          line: node.line,
          column: node.column,
        });
      }
      break;
    case 'number':
      if (node.type !== 'primitive' || node.primitiveType !== 'number') {
        errors.push({
          message: `Expected number, got ${node.type}`,
          path,
          line: node.line,
          column: node.column,
        });
      }
      break;
    case 'boolean':
      if (node.type !== 'primitive' || node.primitiveType !== 'boolean') {
        errors.push({
          message: `Expected boolean, got ${node.type}`,
          path,
          line: node.line,
          column: node.column,
        });
      }
      break;
    case 'null':
      if (node.type !== 'null') {
        errors.push({
          message: `Expected null, got ${node.type}`,
          path,
          line: node.line,
          column: node.column,
        });
      }
      break;
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

