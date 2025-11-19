/**
 * Compact JSON (CJSON) - Main entry point
 * 
 * A token-efficient serialization format designed for LLM interactions.
 * Reduces token count by 40-70% compared to JSON while maintaining readability.
 * 
 * @example
 * ```ts
 * import { encode, decode } from 'cjson';
 * 
 * // Encode JavaScript to CJSON
 * const cjson = encode({ name: 'Alice', age: 30 });
 * // name: Alice
 * // age: 30
 * 
 * // Decode CJSON to JavaScript
 * const data = decode('name: Alice\nage: 30');
 * // { name: 'Alice', age: 30 }
 * ```
 */

// Core functions
export { encode, encodeAST, type EncodeOptions } from './encoder/encoder';
export { decode, parseWithOptions, encodeWithOptions, encodeASTWithOptions, validateWithOptions } from './core/core';
export { parse } from './parser/parser';

// AST types and utilities
export type { ASTNode, ObjectNode, ArrayNode, PrimitiveNode, NullNode } from './ast/nodes';
export { astToJS } from './ast/converter';
// Alias for design document compatibility
export { astToJS as astToValue } from './ast/converter';
export * from './ast/builder';

// Options types
export type { ParseOptions, DecodeOptions, CJSONOptions } from './core/types';

// Error types
export { ParseError, EncodeError, ErrorCode } from './errors/errors';

// Validator
export { validate } from './validator/validator';
export type { ValidationResult, PropertySchema, ValidationError } from './validator/types';

