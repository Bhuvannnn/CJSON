/**
 * Validator type definitions
 */

import { ASTNode } from '../ast/nodes';

/**
 * Validation error details
 */
export interface ValidationError {
  /**
   * Error message describing what failed validation
   */
  message: string;
  /**
   * Path to the node that failed validation (e.g., "user.name")
   */
  path: string;
  /**
   * Line number where the error occurred
   */
  line: number;
  /**
   * Column number where the error occurred
   */
  column: number;
}

/**
 * Result of validation
 */
export interface ValidationResult {
  /**
   * Whether the AST is valid
   */
  valid: boolean;
  /**
   * Array of validation errors (empty if valid is true)
   */
  errors: ValidationError[];
}

/**
 * Schema definition for validating object structures
 */
export interface ObjectSchema {
  /**
   * Required property names
   */
  required?: string[];
  /**
   * Property schemas (nested validation)
   */
  properties?: Record<string, PropertySchema>;
}

/**
 * Schema definition for validating array structures
 */
export interface ArraySchema {
  /**
   * Whether array items must be uniform (same structure)
   */
  uniform?: boolean;
  /**
   * Schema for array items (if uniform)
   */
  items?: PropertySchema;
}

/**
 * Schema definition for validating property values
 */
export type PropertySchema =
  | { type: 'string' }
  | { type: 'number' }
  | { type: 'boolean' }
  | { type: 'null' }
  | { type: 'object'; schema: ObjectSchema }
  | { type: 'array'; schema: ArraySchema }
  | { type: 'any' };

