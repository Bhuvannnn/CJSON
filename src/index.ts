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
export { encode, encodeAST, type EncodeOptions } from './encoder/encoder.js';
export { decode, parseWithOptions, encodeWithOptions, encodeASTWithOptions, validateWithOptions } from './core/core.js';
export { parse } from './parser/parser.js';

// AST types and utilities
export type { ASTNode, ObjectNode, ArrayNode, PrimitiveNode, NullNode } from './ast/nodes.js';
export { astToJS } from './ast/converter.js';
// Alias for design document compatibility
export { astToJS as astToValue } from './ast/converter.js';
export * from './ast/builder.js';

// Options types
export type { ParseOptions, DecodeOptions, CJSONOptions } from './core/types.js';

// Error types
export { ParseError, EncodeError, ErrorCode } from './errors/errors.js';

// Validator
export { validate } from './validator/validator.js';
export type { ValidationResult, PropertySchema, ValidationError } from './validator/types.js';

